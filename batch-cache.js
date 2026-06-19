/**
 * StudyRays - Batch Manager
 */

const BATCHES_API_URL = 'https://semfy-gros.github.io/batches/batcha.json';

// ===== Remove old cache/localStorage if exists =====
try {
    localStorage.removeItem('batches_data');
    caches.delete('batches_data').catch(() => {});
    console.log('ðŸ—‘ï¸ Old batches_data removed from localStorage and cache');
} catch (e) {
    console.warn('âš ï¸ Failed to clear old batches_data:', e);
}

// ===== Fuzzy Search Helpers =====

const normalizeText = (t) =>
    (t || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const tokenize = (t) =>
    normalizeText(t).split(/\s+/).map(x => x.replace(/[^a-z0-9]+/g, '')).filter(Boolean);

function calcLevenshtein(a, b) {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array(b.length + 1).fill(0).map((_, i) => i);
    let curr = Array(b.length + 1);

    for (let i = 0; i < a.length; i++) {
        curr[0] = i + 1;

        for (let j = 0; j < b.length; j++) {
            curr[j + 1] = Math.min(
                curr[j] + 1,
                prev[j + 1] + 1,
                prev[j] + (a[i] === b[j] ? 0 : 1)
            );
        }

        [prev, curr] = [curr, prev];
    }

    return prev[b.length];
}

// Damerau-Levenshtein distance (handles transpositions like "pyhsics" -> "physics" as 1 edit)
function damerauLevenshtein(a, b) {
    const al = a.length;
    const bl = b.length;
    if (!al) return bl;
    if (!bl) return al;

    const d = Array(al + 1).fill(null).map(() => Array(bl + 1).fill(0));

    for (let i = 0; i <= al; i++) d[i][0] = i;
    for (let j = 0; j <= bl; j++) d[0][j] = j;

    for (let i = 1; i <= al; i++) {
        for (let j = 1; j <= bl; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,      // Deletion
                d[i][j - 1] + 1,      // Insertion
                d[i - 1][j - 1] + cost // Substitution
            );

            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(
                    d[i][j],
                    d[i - 2][j - 2] + cost // Transposition
                );
            }
        }
    }
    return d[al][bl];
}

// Phonetic and Hinglish normalization helper
function phoneticNormalize(text) {
    if (!text) return '';
    let t = text.toLowerCase().trim();
    
    // Replace common Hinglish interchangeable characters
    t = t.replace(/ee/g, 'i');
    t = t.replace(/oo/g, 'u');
    t = t.replace(/kh/g, 'k');
    t = t.replace(/sh/g, 's');
    t = t.replace(/ch/g, 'c');
    t = t.replace(/ph/g, 'f');
    t = t.replace(/gh/g, 'g');
    t = t.replace(/zh/g, 'z');
    t = t.replace(/jh/g, 'j');
    t = t.replace(/dh/g, 'd');
    t = t.replace(/th/g, 't');
    t = t.replace(/bh/g, 'b');
    
    // Remove double letters (consecutive duplicates)
    let clean = '';
    for (let i = 0; i < t.length; i++) {
        if (i === 0 || t[i] !== t[i - 1]) {
            clean += t[i];
        }
    }
    return clean;
}

function fuzzySearch(searchTerm, sourceArray) {
    if (!searchTerm) return sourceArray.slice();

    const normalized = normalizeText(searchTerm);
    const phoneticSearch = phoneticNormalize(searchTerm);
    const tokens = tokenize(searchTerm).filter(t => t.length >= 1);
    
    // Extract 4-digit years from search term (e.g., 2021-2029)
    const searchYears = (searchTerm.match(/\b(20\d{2})\b/g) || []);
    const results = [];

    sourceArray.forEach((batch, idx) => {
        const batchName = batch.name || '';
        const batchNorm = normalizeText(batchName);
        const phoneticBatch = phoneticNormalize(batchName);
        
        // Extract 4-digit years from batch name
        const batchYears = (batchName.match(/\b(20\d{2})\b/g) || []);
        
        // Find latest year in batch
        let latestYearInBatch = 0;
        if (batchYears.length > 0) {
            latestYearInBatch = Math.max(...batchYears.map(Number));
        }

        let score = 0, matchType = 'none';

        if (batchNorm === normalized) {
            score = 100000;
            matchType = 'exact';
        } else if (phoneticBatch === phoneticSearch && phoneticSearch.length >= 3) {
            score = 80000;
            matchType = 'exact-phonetic';
        } else {
            const batchTokens = tokenize(batchName).filter(t => t.length >= 1);
            const nonYearSearchTokens = tokens.filter(t => !/^\d{4}$/.test(t));

            // Check exact word match (every search token exists as a whole word in batch name)
            const isExactWordMatch = nonYearSearchTokens.length > 0 && 
                nonYearSearchTokens.every(st => batchTokens.includes(st));
                
            const isPhoneticWordMatch = nonYearSearchTokens.length > 0 && 
                nonYearSearchTokens.every(st => {
                    const pst = phoneticNormalize(st);
                    return batchTokens.some(bt => phoneticNormalize(bt) === pst);
                });

            if (isExactWordMatch) {
                score = 50000;
                matchType = 'exact-word';
            } else if (isPhoneticWordMatch) {
                score = 35000;
                matchType = 'exact-word-phonetic';
            } else if (batchNorm.includes(normalized)) {
                score = 20000;
                matchType = 'substring';
            } else if (phoneticBatch.includes(phoneticSearch) && phoneticSearch.length >= 3) {
                score = 15000;
                matchType = 'substring-phonetic';
            } else {
                let totalScore = 0,
                    matched = 0,
                    exactMatches = 0;

            tokens.forEach(st => {
                let best = 0,
                    foundExact = false;
                const isYearToken = /^\d{4}$/.test(st);
                const pst = phoneticNormalize(st);

                batchTokens.forEach(bt => {
                    const isBatchYearToken = /^\d{4}$/.test(bt);
                    const pbt = phoneticNormalize(bt);

                    if (bt === st) {
                        best = 100;
                        foundExact = true;
                    } else if (pst === pbt && pst.length >= 2) {
                        best = Math.max(best, 95); // Exact phonetic token match
                    } else if (bt.indexOf(st) === 0 && st.length >= 2) {
                        best = Math.max(best, 90); // Prefix match
                    } else if (pbt.indexOf(pst) === 0 && pst.length >= 2) {
                        best = Math.max(best, 88); // Phonetic prefix match
                    } else if (bt.includes(st) && st.length >= 2) {
                        best = Math.max(best, 85); // Substring match
                    } else if (st.includes(bt) && bt.length >= 2) {
                        best = Math.max(best, 75);
                    } else if (!isYearToken && !isBatchYearToken) {
                        const mx = Math.max(st.length, bt.length);
                        const dist = damerauLevenshtein(st, bt);
                        const sim = ((mx - dist) / mx) * 100;

                        const mxPhonetic = Math.max(pst.length, pbt.length);
                        const distPhonetic = damerauLevenshtein(pst, pbt);
                        const simPhonetic = ((mxPhonetic - distPhonetic) / mxPhonetic) * 100;

                        const bestSim = Math.max(sim, simPhonetic);
                        const bestDist = Math.min(dist, distPhonetic);
                        const shortestLen = Math.min(st.length, pst.length);

                        // Dynamic typo tolerance rules
                        let isTypoMatch = false;
                        if (shortestLen <= 3 && bestDist <= 1) isTypoMatch = true;
                        else if (shortestLen <= 5 && bestDist <= 2) isTypoMatch = true;
                        else if (shortestLen > 5 && bestDist <= 3) isTypoMatch = true;

                        // Subsequence match (e.g. "phsc" matches "physics")
                        let isSubseq = false;
                        if (st.length >= 3 && bt.length > st.length) {
                            let sIdx = 0;
                            for (let bIdx = 0; bIdx < bt.length && sIdx < st.length; bIdx++) {
                                if (bt[bIdx] === st[sIdx]) sIdx++;
                            }
                            if (sIdx === st.length) {
                                isSubseq = true;
                            }
                        }

                        if (isTypoMatch || isSubseq) {
                            const finalSim = isSubseq ? Math.max(bestSim, 70) : bestSim;
                            best = Math.max(best, finalSim);
                        }
                    }
                });

                if (best >= 40) { // Tolerates extreme typos
                    totalScore += best;
                    matched++;

                    if (foundExact) exactMatches++;
                }
            });

            if (matched > 0) {
                const avg = totalScore / tokens.length;
                const matchRatio = matched / tokens.length;

                // Overall similarity using Damerau-Levenshtein
                const mxOverall = Math.max(batchNorm.length, normalized.length);
                const overallSim = ((mxOverall - damerauLevenshtein(batchNorm, normalized)) / mxOverall) * 100;

                if (avg >= 40 || overallSim >= 35) {
                    score = avg * matchRatio * 10 + (overallSim * 5);

                    if (exactMatches > 0) score += exactMatches * 50;
                    if (matchRatio === 1) score += 100;

                    matchType = 'fuzzy';
                }
            }
        }
    }

        // Year priority logic
        if (searchYears.length > 0 && matchType !== 'none') {
            let yearMatch = false;
            let yearMismatch = false;

            searchYears.forEach(sy => {
                if (batchYears.includes(sy)) {
                    yearMatch = true;
                } else if (batchYears.length > 0) {
                    yearMismatch = true;
                }
            });

            if (yearMatch) {
                score += 200000; // Large boost for exact matching year
            } else if (yearMismatch) {
                score -= 30000;  // Heavy penalty for mismatching year
            }
        }

        // Boost newer/latest batches to the top if matched (scaled down to avoid overriding higher match categories)
        if (matchType !== 'none' && latestYearInBatch > 0) {
            score += (latestYearInBatch - 2000) * 30; // Boost newer years dynamically
        }

        if (matchType !== 'none') {
            results.push({
                batch,
                score: Math.round(score),
                index: idx,
                matchType
            });
        }
    });

    results.sort((a, b) => {
        return b.score - a.score || a.index - b.index;
    });

    return results.map(r => r.batch);
}

// ===== BatchCacheManager Class =====

class BatchCacheManager {
    constructor() {
        this.batches = [];
        this.isLoaded = false;
    }

    async loadBatches() {
        // Serve from memory if already loaded
        if (this.isLoaded) return this.batches;

        console.log('ðŸ“¡ Fetching batches from GitHub...');

        try {
            const response = await fetch(BATCHES_API_URL + '?v=' + Date.now());

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();

            if (data && data.batches && Array.isArray(data.batches)) {
                this.batches = data.batches.map(b => {
                    if (!b._id && b.batch_id) b._id = b.batch_id;
                    return b;
                });

                this.isLoaded = true;

                console.log('âœ… Loaded', this.batches.length, 'batches');

                return this.batches;
            }

            throw new Error('Invalid response format');

        } catch (err) {
            console.error('âŒ Failed to load batches:', err);
            throw err;
        }
    }

    search(query, limit = 50) {
        if (!query || !query.trim()) {
            return this.batches.slice(0, limit);
        }

        return fuzzySearch(query.trim(), this.batches).slice(0, limit);
    }

    getAllBatches() {
        return this.batches;
    }

    getPaginated(page = 1, perPage = 50) {
        const start = (page - 1) * perPage;
        const end = start + perPage;

        const data = this.batches.slice(start, end);

        return {
            data,
            pagination: {
                currentPage: page,
                perPage,
                totalItems: this.batches.length,
                totalPages: Math.ceil(this.batches.length / perPage),
                hasNextPage: end < this.batches.length,
                hasPrevPage: page > 1
            }
        };
    }

    clearCache() {
        this.batches = [];
        this.isLoaded = false;

        localStorage.removeItem('batches_data');

        caches.delete('batches_data').catch(() => {});

        console.log('ðŸ—‘ï¸ Batch data cleared');
    }

    async forceRefresh() {
        this.batches = [];
        this.isLoaded = false;

        localStorage.removeItem('batches_data');

        caches.delete('batches_data').catch(() => {});

        return await this.loadBatches();
    }
}

window.batchCache = new BatchCacheManager();
