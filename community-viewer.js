// Community Viewer - Telegram Style
class CommunityViewer {
    constructor() {
        this.posts = [];
        this.settings = null;
        this.currentPostId = null;
        this.unseenCount = 0;
        this.initialized = false;
        this.lastPostId = 0;
        this.checkNewPostsInterval = null;
        this.cachedPosts = null;
        this.cacheTimestamp = 0;
        
        // Infinite scroll
        this.currentPage = 1;
        this.postsPerPage = 10;
        this.isLoading = false;
        this.hasMorePosts = true;
        this.allPosts = [];
        
        // Intersection Observer for view tracking
        this.viewObserver = null;
        
        console.log('ðŸš€ Community Viewer: Constructor called');
        this.init();
    }

    async init() {
        console.log('ðŸ”„ Community Viewer: Initializing...');
        try {
            await this.loadSettings();
            console.log('âœ… Settings loaded:', this.settings);
            this.createModal();
            console.log('âœ… Modal created');
            this.loadUnseenCount();
            this.setupEventListeners();
            this.initialized = true;
            console.log('âœ… Community Viewer: Initialized successfully');
            
            // Check for unseen posts every 10 seconds
            setInterval(() => this.loadUnseenCount(), 10000);
        } catch (error) {
            console.error('âŒ Community Viewer: Initialization failed', error);
        }
    }

    async loadSettings() {
        try {
            console.log('ðŸ“¡ Fetching settings from API...');
            const response = await fetch('api/community_settings.php?action=get');
            const data = await response.json();
            
            if (data.success) {
                this.settings = data.settings;
                console.log('âœ… Settings loaded successfully');
            } else {
                console.warn('âš ï¸ Settings API returned error, using defaults');
                this.useDefaultSettings();
            }
        } catch (error) {
            console.error('âŒ Error loading settings:', error);
            this.useDefaultSettings();
        }
    }

    useDefaultSettings() {
        console.log('ðŸ”§ Using default settings');
        this.settings = {
            features: {
                enable_views: true,
                enable_reactions: true,
                enable_images: true
            },
            reactions: {
                available_emojis: ['ðŸ‘', 'â¤ï¸', 'ðŸ”¥', 'ðŸŽ‰', 'ðŸ˜Š', 'ðŸ‘', 'ðŸ’¯', 'ðŸš€']
            },
            branding: {
                channel_name: 'StudyRays Community',
                channel_subtitle: 'Official Announcements',
                channel_icon: 'fa-solid fa-bullhorn'
            }
        };
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'communityModal';
        modal.className = 'community-modal';
        modal.innerHTML = `
            <div class="community-container">
                <div class="community-header">
                    <div class="header-left">
                        <button class="close-community-btn" id="closeCommunityBtn">
                            <i class="fa-solid fa-times"></i>
                        </button>
                        <div class="channel-avatar">
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCg5id4_FFO1s3IBkcNdWmvE-tkQ_RaZcFiA&s" alt="StudyRays">
                        </div>
                        <div class="channel-info">
                            <div class="channel-name-wrapper">
                                <h2>StudyRays Official</h2>
                                <span class="verified-badge" title="Verified Channel">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" fill-rule="evenodd" d="M10.8277 1.51559C11.3682 0.828135 12.4097 0.828136 12.9502 1.51559L14.6969 3.73719L17.4159 2.96658C18.2572 2.72811 19.0998 3.34029 19.133 4.21416L19.2403 7.03817L21.893 8.01288C22.7138 8.3145 23.0356 9.30502 22.5488 10.0315L20.9757 12.3792L22.5488 14.727C23.0356 15.4535 22.7138 16.444 21.893 16.7456L19.2403 17.7203L19.133 20.5443C19.0998 21.4182 18.2572 22.0304 17.4159 21.7919L14.6969 21.0213L12.9502 23.2429C12.4097 23.9304 11.3682 23.9304 10.8277 23.2429L9.08097 21.0213L6.36203 21.7919C5.52067 22.0304 4.67808 21.4182 4.64488 20.5443L4.53758 17.7203L1.88494 16.7456C1.06411 16.444 0.742267 15.4535 1.22905 14.727L2.80215 12.3793L1.22905 10.0315C0.742266 9.30502 1.06411 8.3145 1.88494 8.01288L4.53758 7.03816L4.64488 4.21416C4.67808 3.34029 5.52067 2.72812 6.36203 2.96658L9.08097 3.73719L10.8277 1.51559ZM8.35859 11.8486C8.65148 11.5557 9.12635 11.5557 9.41925 11.8486L10.8889 13.3182L14.3586 9.84858C14.6515 9.55568 15.1264 9.55568 15.4192 9.84858C15.7121 10.1415 15.7121 10.6163 15.4192 10.9092L11.4192 14.9092C11.1264 15.2021 10.6515 15.2021 10.3586 14.9092L8.35859 12.9092C8.06569 12.6163 8.06569 12.1415 8.35859 11.8486Z" clip-rule="evenodd"></path>
                                    </svg>
                                </span>
                            </div>
                            <p class="channel-subtitle">${this.settings.branding.channel_subtitle}</p>
                        </div>
                    </div>
                    <div class="header-right">
                        <button class="header-action-btn" id="refreshPostsBtn" title="Refresh">
                            <i class="fa-solid fa-rotate-right"></i>
                        </button>
                    </div>
                </div>
                
                <div class="community-content" id="communityContent">
                    <div class="posts-loading">
                        <div class="loader"></div>
                        <p>Loading posts...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupEventListeners() {
        // Open community button
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-open-community]')) {
                e.preventDefault();
                this.open();
            }
        });

        // Close button
        document.getElementById('closeCommunityBtn').addEventListener('click', () => {
            this.close();
        });

        // Refresh button
        document.getElementById('refreshPostsBtn').addEventListener('click', () => {
            this.resetAndLoadPosts();
        });

        // Close on outside click
        document.getElementById('communityModal').addEventListener('click', (e) => {
            if (e.target.id === 'communityModal') {
                this.close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('communityModal').classList.contains('active')) {
                this.close();
            }
        });
        
        // Infinite scroll
        const contentArea = document.getElementById('communityContent');
        contentArea.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }
    
    handleScroll() {
        const container = document.getElementById('communityContent');
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // Load more when 200px from bottom
        if (scrollHeight - scrollTop - clientHeight < 200) {
            if (!this.isLoading && this.hasMorePosts) {
                console.log('ðŸ“œ Loading more posts...');
                this.loadMorePosts();
            }
        }
    }
    
    resetAndLoadPosts() {
        console.log('ðŸ”„ Resetting and loading posts...');
        this.currentPage = 1;
        this.hasMorePosts = true;
        this.allPosts = [];
        this.cachedPosts = null;
        this.cacheTimestamp = 0;
        this.loadPosts();
    }

    async loadUnseenCount() {
        try {
            const response = await fetch('api/channel-community.php?action=unseen_count');
            const data = await response.json();
            
            if (data.success) {
                this.unseenCount = data.count;
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error loading unseen count:', error);
        }
    }

    updateBadge() {
        // Update badge on community button
        const buttons = document.querySelectorAll('[data-open-community]');
        buttons.forEach(btn => {
            let badge = btn.querySelector('.community-badge');
            
            if (this.unseenCount > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'community-badge';
                    btn.style.position = 'relative';
                    btn.appendChild(badge);
                }
                badge.textContent = this.unseenCount > 99 ? '99+' : this.unseenCount;
                badge.style.display = 'flex';
            } else if (badge) {
                badge.style.display = 'none';
            }
        });
    }

    async open() {
        document.getElementById('communityModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Clear cache to force fresh data load
        this.cachedPosts = null;
        this.cacheTimestamp = 0;
        this.currentPage = 1;
        
        await this.loadPosts();
        
        // Mark all loaded posts as seen when user opens the modal
        this.posts.forEach(post => this.markAsSeen(post.id));
        
        // Start checking for new posts if auto-append is enabled
        if (this.settings?.cache?.auto_append_new) {
            this.startCheckingNewPosts();
        }
    }

    close() {
        document.getElementById('communityModal').classList.remove('active');
        document.body.style.overflow = '';
        
        // Stop checking for new posts
        this.stopCheckingNewPosts();
    }

    startCheckingNewPosts() {
        if (this.checkNewPostsInterval) {
            clearInterval(this.checkNewPostsInterval);
        }
        
        const interval = (this.settings?.cache?.check_interval || 30) * 1000;
        console.log(`ðŸ”„ Starting auto-check for new posts every ${interval/1000}s`);
        
        this.checkNewPostsInterval = setInterval(() => {
            this.checkForNewPosts();
        }, interval);
    }

    stopCheckingNewPosts() {
        if (this.checkNewPostsInterval) {
            console.log('â¹ï¸ Stopping auto-check for new posts');
            clearInterval(this.checkNewPostsInterval);
            this.checkNewPostsInterval = null;
        }
    }

    async checkForNewPosts() {
        try {
            console.log('ðŸ” Checking for new posts...');
            const response = await fetch(`api/channel-community.php?action=list&since=${this.lastPostId}`);
            const data = await response.json();
            
            if (data.success && data.posts && data.posts.length > 0) {
                console.log(`âœ¨ Found ${data.posts.length} new post(s)`);
                
                // Prepend new posts
                const newPosts = data.posts.filter(p => p.id > this.lastPostId);
                if (newPosts.length > 0) {
                    // Update allPosts array
                    this.allPosts = [...newPosts, ...this.allPosts];
                    
                    // Update displayed posts
                    const currentDisplayCount = this.posts.length;
                    this.posts = this.allPosts.slice(0, currentDisplayCount + newPosts.length);
                    
                    // Update last post ID
                    this.lastPostId = Math.max(...this.allPosts.map(p => p.id));
                    
                    // Prepend with animation
                    this.prependNewPosts(newPosts);
                    
                    // Update unseen count
                    this.loadUnseenCount();
                    
                    // Show notification
                    this.showNewPostsNotification(newPosts.length);
                }
            }
        } catch (error) {
            console.error('âŒ Error checking for new posts:', error);
        }
    }

    async prependNewPosts(newPosts) {
        const container = document.getElementById('communityContent');
        
        // Render new posts asynchronously
        const newPostsHtmlArray = await Promise.all(newPosts.map(post => this.renderPost(post)));
        const newPostsHtml = newPostsHtmlArray.join('');
        
        // Create temporary container
        const temp = document.createElement('div');
        temp.innerHTML = newPostsHtml;
        
        // Prepend with animation
        Array.from(temp.children).reverse().forEach(postElement => {
            postElement.style.opacity = '0';
            postElement.style.transform = 'translateY(-20px)';
            container.insertBefore(postElement, container.firstChild);
            
            // Animate in
            setTimeout(() => {
                postElement.style.transition = 'all 0.3s ease';
                postElement.style.opacity = '1';
                postElement.style.transform = 'translateY(0)';
            }, 10);
        });
        
        // Re-setup reaction buttons
        this.setupReactionButtons();
        
        // Setup view observer for new posts
        this.setupViewObserver();
        
        // Show notification
        this.showNewPostsNotification(newPosts.length);
    }

    showNewPostsNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'new-posts-notification';
        notification.innerHTML = `
            <i class="fa-solid fa-sparkles"></i>
            <span>${count} new post${count > 1 ? 's' : ''} added!</span>
        `;
        
        const modal = document.getElementById('communityModal');
        if (modal) {
            modal.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }
    
    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        document.querySelectorAll('.community-toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `community-toast community-toast-${type}`;
        
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    async loadPosts() {
        const container = document.getElementById('communityContent');
        
        // Check cache if enabled
        if (this.settings?.cache?.enable_post_cache && this.currentPage === 1) {
            const cacheAge = Date.now() - this.cacheTimestamp;
            const cacheDuration = (this.settings.cache.cache_duration || 300) * 1000;
            
            if (this.cachedPosts && cacheAge < cacheDuration) {
                console.log(`ðŸ“¦ Using cached posts (age: ${Math.round(cacheAge/1000)}s)`);
                this.allPosts = this.cachedPosts;
                this.posts = this.allPosts.slice(0, this.postsPerPage);
                this.currentPage = 1;
                this.hasMorePosts = this.allPosts.length > this.postsPerPage;
                this.renderPosts();
                
                // Setup reaction buttons after rendering
                this.setupReactionButtons();
                
                // Setup view observer (no automatic view increment)
                this.setupViewObserver();
                return;
            }
        }
        
        if (this.currentPage === 1) {
            container.innerHTML = `
                <div class="posts-loading">
                    <div class="loader"></div>
                    <p>Loading posts...</p>
                </div>
            `;
        }

        this.isLoading = true;

        try {
            console.log('ðŸ“¡ Fetching posts from API...');
            const response = await fetch('api/channel-community.php?action=list');
            const data = await response.json();
            
            console.log('ðŸ“¦ Posts API response:', data);
            
            if (data.success) {
                this.allPosts = data.posts || [];
                console.log(`âœ… Loaded ${this.allPosts.length} total posts`);
                
                // Update cache
                if (this.settings?.cache?.enable_post_cache) {
                    this.cachedPosts = this.allPosts;
                    this.cacheTimestamp = Date.now();
                    console.log('ðŸ’¾ Posts cached');
                }
                
                // Get posts for current page
                const startIndex = 0;
                const endIndex = this.currentPage * this.postsPerPage;
                this.posts = this.allPosts.slice(startIndex, endIndex);
                this.hasMorePosts = endIndex < this.allPosts.length;
                
                // Track last post ID for auto-append
                if (this.allPosts.length > 0) {
                    this.lastPostId = Math.max(...this.allPosts.map(p => p.id));
                }
                
                this.renderPosts();
                
                // Setup reaction buttons after rendering
                this.setupReactionButtons();
                
                // Setup view observer for scroll-based tracking (no automatic increment)
                this.setupViewObserver();
            } else {
                console.error('âŒ Posts API error:', data.message);
                container.innerHTML = `
                    <div class="error-state">
                        <i class="fa-solid fa-exclamation-circle"></i>
                        <p>Failed to load posts</p>
                        <p style="font-size: 0.875rem; color: #999;">${data.message || 'Unknown error'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('âŒ Error loading posts:', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-exclamation-circle"></i>
                    <p>Failed to load posts</p>
                    <p style="font-size: 0.875rem; color: #999;">${error.message}</p>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadMorePosts() {
        if (this.isLoading || !this.hasMorePosts) return;
        
        this.isLoading = true;
        console.log(`ðŸ“œ Loading page ${this.currentPage + 1}...`);
        
        // Show loading indicator
        const container = document.getElementById('communityContent');
        const loader = document.createElement('div');
        loader.className = 'load-more-indicator';
        loader.innerHTML = `
            <div class="loader-small"></div>
            <p>Loading more posts...</p>
        `;
        container.appendChild(loader);
        
        // Simulate slight delay for smooth UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        this.currentPage++;
        const startIndex = 0;
        const endIndex = this.currentPage * this.postsPerPage;
        this.posts = this.allPosts.slice(startIndex, endIndex);
        this.hasMorePosts = endIndex < this.allPosts.length;
        
        console.log(`âœ… Loaded ${this.posts.length} posts (page ${this.currentPage})`);
        
        // Remove loader
        loader.remove();
        
        // Re-render all posts
        this.renderPosts();
        this.setupReactionButtons();
        
        // Setup view observer (will track views when posts become visible)
        this.setupViewObserver();
        
        // Mark new posts as seen since modal is already open
        const newPosts = this.allPosts.slice(endIndex - this.postsPerPage, endIndex);
        newPosts.forEach(post => this.markAsSeen(post.id));
        
        this.isLoading = false;
    }

    async incrementView(postId) {
        try {
            // Check if already viewed in this session
            const viewedKey = `viewed_post_${postId}`;
            if (sessionStorage.getItem(viewedKey)) {
                console.log(`â­ï¸ Post ${postId} already viewed in this session`);
                return;
            }

            console.log(`ðŸ‘ï¸ Incrementing view for post ${postId}`);
            const response = await fetch(`api/channel-community.php?action=get&id=${postId}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`âœ… View incremented for post ${postId}, new count: ${data.post.views}`);
                // Mark as viewed in this session
                sessionStorage.setItem(viewedKey, 'true');
                
                // Update the view count in the UI
                const viewElement = document.querySelector(`[data-post-id="${postId}"] .post-stats span i.fa-eye`);
                if (viewElement && viewElement.parentElement) {
                    viewElement.parentElement.innerHTML = `<i class="fa-solid fa-eye"></i> ${this.formatNumber(data.post.views)}`;
                }
            }
        } catch (error) {
            console.error(`âŒ Error incrementing view for post ${postId}:`, error);
        }
    }
    
    setupViewObserver() {
        // Disconnect existing observer if any
        if (this.viewObserver) {
            this.viewObserver.disconnect();
        }
        
        // Create Intersection Observer for view tracking
        this.viewObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // Post is visible (at least 50% in viewport)
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    const postElement = entry.target;
                    const postId = parseInt(postElement.dataset.postId);
                    
                    // Check if already viewed
                    const viewedKey = `viewed_post_${postId}`;
                    if (!sessionStorage.getItem(viewedKey)) {
                        console.log(`ðŸ‘ï¸ Post ${postId} is now visible, incrementing view...`);
                        this.incrementView(postId);
                    }
                }
            });
        }, {
            root: document.getElementById('communityContent'),
            threshold: 0.5 // 50% of post must be visible
        });
        
        // Observe all post elements
        const postElements = document.querySelectorAll('.community-post[data-post-id]');
        postElements.forEach(post => {
            this.viewObserver.observe(post);
        });
        
        console.log(`ðŸ‘€ View observer setup for ${postElements.length} posts`);
    }

    async renderPosts() {
        const container = document.getElementById('communityContent');
        
        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No posts yet</p>
                </div>
            `;
            return;
        }

        // Render all posts asynchronously
        const postsHtml = await Promise.all(this.posts.map(post => this.renderPost(post)));
        container.innerHTML = postsHtml.join('');
        
        // IMPORTANT: Setup reaction buttons after rendering
        console.log('ðŸ”˜ Setting up reaction buttons...');
        this.setupReactionButtons();
        
        // Setup view observer for scroll-based view tracking
        this.setupViewObserver();
    }

    async renderPost(post) {
        const reactions = JSON.parse(post.reactions || '[]');
        
        // Check if settings are loaded
        if (!this.settings) {
            return '<div class="loading-state"><div class="loader"></div></div>';
        }
        
        // Get user's reactions from localStorage
        const userReactions = await this.getUserReactions(post.id);
        
        // Sort reactions by count (most popular first)
        reactions.sort((a, b) => (b.count || 0) - (a.count || 0));
        
        return `
            <div class="community-post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">
                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCg5id4_FFO1s3IBkcNdWmvE-tkQ_RaZcFiA&s" alt="StudyRays" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                        </div>
                        <div class="author-info">
                            <div class="author-name">
                                StudyRays Admin
                                <span class="verified-badge" title="Verified Account">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24">
                                        <path fill="currentColor" fill-rule="evenodd" d="M10.8277 1.51559C11.3682 0.828135 12.4097 0.828136 12.9502 1.51559L14.6969 3.73719L17.4159 2.96658C18.2572 2.72811 19.0998 3.34029 19.133 4.21416L19.2403 7.03817L21.893 8.01288C22.7138 8.3145 23.0356 9.30502 22.5488 10.0315L20.9757 12.3792L22.5488 14.727C23.0356 15.4535 22.7138 16.444 21.893 16.7456L19.2403 17.7203L19.133 20.5443C19.0998 21.4182 18.2572 22.0304 17.4159 21.7919L14.6969 21.0213L12.9502 23.2429C12.4097 23.9304 11.3682 23.9304 10.8277 23.2429L9.08097 21.0213L6.36203 21.7919C5.52067 22.0304 4.67808 21.4182 4.64488 20.5443L4.53758 17.7203L1.88494 16.7456C1.06411 16.444 0.742267 15.4535 1.22905 14.727L2.80215 12.3793L1.22905 10.0315C0.742266 9.30502 1.06411 8.3145 1.88494 8.01288L4.53758 7.03816L4.64488 4.21416C4.67808 3.34029 5.52067 2.72812 6.36203 2.96658L9.08097 3.73719L10.8277 1.51559ZM8.35859 11.8486C8.65148 11.5557 9.12635 11.5557 9.41925 11.8486L10.8889 13.3182L14.3586 9.84858C14.6515 9.55568 15.1264 9.55568 15.4192 9.84858C15.7121 10.1415 15.7121 10.6163 15.4192 10.9092L11.4192 14.9092C11.1264 15.2021 10.6515 15.2021 10.3586 14.9092L8.35859 12.9092C8.06569 12.6163 8.06569 12.1415 8.35859 11.8486Z" clip-rule="evenodd"></path>
                                    </svg>
                                </span>
                            </div>
                            <div class="post-time">${this.formatDate(post.created_at)}</div>
                        </div>
                    </div>
                    ${post.updated_at !== post.created_at ? '<span class="edited-badge">edited</span>' : ''}
                </div>
                
                <div class="post-body">
                    <div class="post-content">${post.content}</div>
                    ${post.image_url && post.image_url.trim() && this.settings.features.enable_images ? `
                        <div class="post-image-container loading" data-image-container>
                            <img src="${post.image_url}" 
                                 alt="Post image" 
                                 class="post-image" 
                                 loading="lazy"
                                 onload="this.style.opacity='1'; this.parentElement.classList.remove('loading'); console.log('âœ… Image loaded:', this.src)"
                                 onerror="console.error('âŒ Image failed:', this.src); this.parentElement.classList.remove('loading'); this.parentElement.innerHTML='<div class=post-image-error><i class=fa-solid fa-image-slash></i><br><small>Image failed to load</small></div>'"
                                 style="opacity:0;transition:opacity 0.3s ease">
                        </div>
                    ` : ''}
                </div>
                
                <div class="post-footer">
                    ${this.settings.features.enable_views ? `
                        <div class="post-stats">
                            <span><i class="fa-solid fa-eye"></i> ${this.formatNumber(post.views || 0)}</span>
                        </div>
                    ` : '<div></div>'}
                    ${this.settings.features.enable_reactions ? `
                        <div class="post-reactions">
                            ${reactions.length > 0 ? `
                                <div class="reactions-list">
                                    ${reactions.map(r => {
                                        const isActive = userReactions.includes(r.emoji);
                                        return `
                                            <button class="reaction-item ${isActive ? 'active' : ''}" 
                                                    data-post-id="${post.id}" 
                                                    data-emoji="${r.emoji}"
                                                    title="${isActive ? 'Click to remove your reaction' : 'Click to add this reaction'}">
                                                <span class="reaction-emoji">${r.emoji}</span>
                                                <span class="reaction-count">${this.formatNumber(r.count || 0)}</span>
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                            ` : ''}
                            <button class="add-reaction-btn" data-post-id="${post.id}" title="Add reaction">
                                <i class="fa-regular fa-face-smile"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    setupReactionButtons() {
        console.log('ðŸ”˜ Setting up reaction buttons...');
        
        // Remove old event listeners by cloning and replacing
        const addBtns = document.querySelectorAll('#communityContent .add-reaction-btn');
        const reactionBtns = document.querySelectorAll('#communityContent .reaction-item');
        
        console.log(`Found ${addBtns.length} add-reaction buttons and ${reactionBtns.length} reaction items`);
        
        // Add reaction button
        addBtns.forEach(btn => {
            // Clone to remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const postId = parseInt(newBtn.dataset.postId);
                console.log('ðŸŽ¯ Opening reaction picker for post:', postId);
                this.showReactionPicker(postId, newBtn);
            });
        });

        // Existing reactions
        reactionBtns.forEach(btn => {
            // Clone to remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const postId = parseInt(newBtn.dataset.postId);
                const emoji = newBtn.dataset.emoji;
                console.log('ðŸŽ¯ Toggling reaction:', emoji, 'for post:', postId);
                await this.toggleReaction(postId, emoji);
            });
        });
        
        console.log('âœ… Reaction buttons setup complete');
    }

    showReactionPicker(postId, button) {
        console.log('ðŸŽ¨ Showing reaction picker for post:', postId);
        
        // Check if reactions are enabled
        if (!this.settings.features.enable_reactions) {
            console.warn('âš ï¸ Reactions are disabled');
            return;
        }

        // Remove existing picker
        document.querySelectorAll('.reaction-picker').forEach(p => {
            console.log('ðŸ—‘ï¸ Removing old picker');
            p.remove();
        });

        const picker = document.createElement('div');
        picker.className = 'reaction-picker';
        
        const emojis = this.settings.reactions.available_emojis;
        console.log('ðŸ˜€ Available emojis:', emojis);
        
        // Create horizontal scrollable container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'reaction-picker-scroll';
        scrollContainer.innerHTML = emojis.map(emoji => `
            <button class="reaction-emoji-btn" data-emoji="${emoji}" data-post-id="${postId}">
                ${emoji}
            </button>
        `).join('');
        
        picker.appendChild(scrollContainer);

        // Find the post element and add picker inside it
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postElement) {
            console.error('âŒ Post element not found for ID:', postId);
            return;
        }
        
        // Insert picker before post-footer
        const postFooter = postElement.querySelector('.post-footer');
        if (postFooter) {
            postFooter.parentNode.insertBefore(picker, postFooter);
        } else {
            postElement.appendChild(picker);
        }
        
        console.log('âœ… Picker added to post');

        // Mobile gesture support - swipe down to close
        let touchStartY = 0;
        let touchEndY = 0;
        
        picker.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        picker.addEventListener('touchmove', (e) => {
            touchEndY = e.touches[0].clientY;
            const diff = touchEndY - touchStartY;
            
            // Visual feedback while swiping
            if (diff > 0) {
                picker.style.transform = `translateY(${diff}px)`;
                picker.style.opacity = Math.max(0.3, 1 - (diff / 100));
            }
        }, { passive: true });
        
        picker.addEventListener('touchend', () => {
            const swipeDistance = touchEndY - touchStartY;
            
            // If swiped down more than 50px, close picker
            if (swipeDistance > 50) {
                picker.style.transition = 'all 0.2s ease';
                picker.style.transform = 'translateY(100px)';
                picker.style.opacity = '0';
                setTimeout(() => picker.remove(), 200);
            } else {
                // Reset position
                picker.style.transition = 'all 0.2s ease';
                picker.style.transform = 'translateY(0)';
                picker.style.opacity = '1';
            }
        });

        // Setup emoji buttons
        picker.querySelectorAll('.reaction-emoji-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const emoji = btn.dataset.emoji;
                const pid = parseInt(btn.dataset.postId);
                console.log('ðŸŽ¯ Emoji clicked:', emoji, 'for post:', pid);
                
                // Check reaction limit using localStorage
                const maxReactions = this.settings.reactions.max_reactions_per_user || 999;
                const userReactions = await this.getUserReactions(pid);
                
                // Check if adding new reaction would exceed limit
                if (!userReactions.includes(emoji) && userReactions.length >= maxReactions) {
                    // For single reaction mode, it will auto-replace in toggleReaction
                    if (maxReactions === 1) {
                        // Just proceed - toggleReaction will handle the replacement
                    } else {
                        // For multiple reaction mode, show warning
                        this.showToast(`You can only add ${maxReactions} reaction${maxReactions > 1 ? 's' : ''} per post. Remove one first!`, 'warning', 3000);
                        picker.remove();
                        return;
                    }
                }
                
                await this.toggleReaction(pid, emoji);
                picker.remove();
            });
            
            // Mobile haptic feedback
            btn.addEventListener('touchstart', () => {
                if (navigator.vibrate) {
                    navigator.vibrate(10); // Short vibration
                }
            });
        });

        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!picker.contains(e.target) && e.target !== button) {
                    console.log('ðŸšª Closing picker (outside click)');
                    picker.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    async toggleReaction(postId, emoji) {
        console.log('ðŸ”„ Toggling reaction:', emoji, 'for post:', postId);
        
        try {
            // Get current user reactions from localStorage
            const userReactions = await this.getUserReactions(postId);
            const hasReaction = userReactions.includes(emoji);
            
            // Determine action
            const action = hasReaction ? 'remove' : 'add';
            
            // Check reaction limit before adding
            if (action === 'add') {
                const maxReactions = this.settings.reactions.max_reactions_per_user || 999;
                
                // If limit is 1 (single reaction mode) and user already has a reaction
                if (maxReactions === 1 && userReactions.length >= 1) {
                    // Remove the existing reaction first
                    const existingEmoji = userReactions[0];
                    console.log(`ðŸ”„ Single reaction mode: Replacing ${existingEmoji} with ${emoji}`);
                    
                    // Remove existing reaction from server
                    const removeFormData = new FormData();
                    removeFormData.append('action', 'react');
                    removeFormData.append('id', postId);
                    removeFormData.append('emoji', existingEmoji);
                    removeFormData.append('react_action', 'remove');
                    
                    await fetch('api/channel-community.php', {
                        method: 'POST',
                        body: removeFormData
                    });
                    
                    // Clear localStorage
                    userReactions.length = 0;
                    await this.setUserReactions(postId, userReactions);
                    
                    // Show toast
                    this.showToast(`Reaction changed to ${emoji}`, 'success', 2000);
                }
                // For multiple reaction mode, check limit
                else if (userReactions.length >= maxReactions) {
                    this.showToast(`You can only add ${maxReactions} reaction${maxReactions > 1 ? 's' : ''} per post. Remove one first!`, 'warning', 3000);
                    return;
                }
            }
            
            const formData = new FormData();
            formData.append('action', 'react');
            formData.append('id', postId);
            formData.append('emoji', emoji);
            formData.append('react_action', action);

            console.log(`ðŸ“¤ Sending reaction request (${action})...`);
            const response = await fetch('api/channel-community.php', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('ðŸ“¥ Reaction response:', data);
            
            if (data.success) {
                console.log('âœ… Reaction successful');
                
                // Update localStorage
                if (action === 'add') {
                    userReactions.push(emoji);
                } else {
                    const index = userReactions.indexOf(emoji);
                    if (index > -1) {
                        userReactions.splice(index, 1);
                    }
                }
                await this.setUserReactions(postId, userReactions);
                
                // Update the post in memory
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    post.reactions = JSON.stringify(data.reactions);
                }
                
                // Update the post in allPosts array
                const allPost = this.allPosts.find(p => p.id === postId);
                if (allPost) {
                    allPost.reactions = JSON.stringify(data.reactions);
                }
                
                // Re-render just this post
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement && post) {
                    const newPostHtml = await this.renderPost(post);
                    const temp = document.createElement('div');
                    temp.innerHTML = newPostHtml;
                    postElement.replaceWith(temp.firstElementChild);
                    
                    // Re-setup reaction buttons
                    this.setupReactionButtons();
                }
            } else {
                console.error('âŒ Reaction failed:', data.message);
                this.showToast('Failed to update reaction', 'error');
            }
        } catch (error) {
            console.error('âŒ Error toggling reaction:', error);
            this.showToast('Error updating reaction', 'error');
        }
    }

    async markAsSeen(postId) {
        try {
            const formData = new FormData();
            formData.append('action', 'mark_seen');
            formData.append('id', postId);

            await fetch('api/channel-community.php', {
                method: 'POST',
                body: formData
            });

            // Update unseen count
            this.loadUnseenCount();
        } catch (error) {
            console.error('Error marking as seen:', error);
        }
    }

    async getUserId() {
        // Check if we already have a stored fingerprint
        const storedId = localStorage.getItem('community_device_id');
        if (storedId) {
            return storedId;
        }
        
        // Generate advanced device fingerprint
        const fingerprint = await this.generateDeviceFingerprint();
        
        // Create cryptographic hash
        const hash = await this.hashFingerprint(fingerprint);
        
        // Store in localStorage for consistency
        localStorage.setItem('community_device_id', hash);
        
        return hash;
    }
    
    async generateDeviceFingerprint() {
        const components = [];
        
        // 1. Canvas fingerprinting (unique per GPU/driver)
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('StudyRays ðŸš€', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Community', 4, 17);
            
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-error');
        }
        
        // 2. WebGL fingerprinting
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {
            components.push('webgl-error');
        }
        
        // 3. Audio fingerprinting
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            
            gainNode.gain.value = 0;
            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(0);
            const audioFingerprint = analyser.frequencyBinCount;
            oscillator.stop();
            
            components.push(audioFingerprint.toString());
        } catch (e) {
            components.push('audio-error');
        }
        
        // 4. Screen & Hardware info
        components.push(screen.width);
        components.push(screen.height);
        components.push(screen.colorDepth);
        components.push(screen.pixelDepth);
        components.push(window.devicePixelRatio);
        components.push(navigator.hardwareConcurrency || 'unknown');
        components.push(navigator.maxTouchPoints || 0);
        
        // 5. Browser & System info
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(navigator.languages ? navigator.languages.join(',') : '');
        components.push(navigator.platform);
        components.push(navigator.vendor);
        components.push(navigator.doNotTrack || 'unknown');
        
        // 6. Timezone
        components.push(new Date().getTimezoneOffset());
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        // 7. Fonts detection (common fonts)
        const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Palatino', 'Garamond', 'Comic Sans MS', 'Trebuchet MS', 'Impact'];
        const detectedFonts = [];
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const baseWidths = {};
        baseFonts.forEach(baseFont => {
            ctx.font = testSize + ' ' + baseFont;
            baseWidths[baseFont] = ctx.measureText(testString).width;
        });
        
        fonts.forEach(font => {
            let detected = false;
            baseFonts.forEach(baseFont => {
                ctx.font = testSize + ' ' + font + ',' + baseFont;
                const width = ctx.measureText(testString).width;
                if (width !== baseWidths[baseFont]) {
                    detected = true;
                }
            });
            if (detected) {
                detectedFonts.push(font);
            }
        });
        
        components.push(detectedFonts.join(','));
        
        // 8. Browser features
        components.push(typeof(Worker) !== 'undefined');
        components.push(typeof(SharedWorker) !== 'undefined');
        components.push(!!window.indexedDB);
        components.push(!!window.openDatabase);
        components.push(!!document.body.addBehavior);
        components.push(!!window.localStorage);
        components.push(!!window.sessionStorage);
        
        // 9. Media devices
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                components.push(devices.length);
                components.push(devices.filter(d => d.kind === 'audioinput').length);
                components.push(devices.filter(d => d.kind === 'videoinput').length);
            }
        } catch (e) {
            components.push('media-error');
        }
        
        // 10. Battery API (if available)
        try {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                components.push(battery.charging);
                components.push(Math.round(battery.level * 100));
            }
        } catch (e) {
            components.push('battery-error');
        }
        
        return components.join('|||');
    }
    
    async hashFingerprint(fingerprint) {
        // Use SubtleCrypto API for secure hashing
        if (window.crypto && window.crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(fingerprint);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return 'fp_' + hashHex.substring(0, 32);
            } catch (e) {
                console.warn('Crypto API failed, using fallback hash');
            }
        }
        
        // Fallback: Simple hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }
    
    async getUserReactions(postId) {
        try {
            const userId = await this.getUserId();
            const key = `community_reactions_${postId}_${userId}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading user reactions from localStorage:', error);
            return [];
        }
    }
    
    async setUserReactions(postId, reactions) {
        try {
            const userId = await this.getUserId();
            const key = `community_reactions_${postId}_${userId}`;
            localStorage.setItem(key, JSON.stringify(reactions));
        } catch (error) {
            console.error('Error saving user reactions to localStorage:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        // Parse date - server stores in local timezone
        const postDate = new Date(dateString);
        const now = new Date();
        
        // Calculate difference in milliseconds
        const diff = now - postDate;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Debug log
        console.log(`ðŸ“… Post date: ${postDate}, Now: ${now}, Diff: ${hours}h`);
        
        // Just now (less than 1 minute)
        if (minutes < 1) {
            return 'just now';
        }
        
        // Minutes ago (less than 1 hour)
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        // Hours ago (less than 24 hours)
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        // Today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        if (postDate >= todayStart) {
            return 'today';
        }
        
        // Yesterday
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        if (postDate >= yesterdayStart) {
            return 'yesterday';
        }
        
        // This week (show day name)
        if (days < 7) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return dayNames[postDate.getDay()];
        }
        
        // More than a week (show date)
        const options = { 
            day: 'numeric', 
            month: 'short',
            year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        };
        
        return postDate.toLocaleDateString('en-IN', options);
    }
    
    formatNumber(num) {
        // Format numbers: 1234 â†’ 1.23k, 1234567 â†’ 1.23M
        if (num < 1000) {
            return num.toString();
        } else if (num < 1000000) {
            return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
        } else if (num < 1000000000) {
            return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
        } else {
            return (num / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'B';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.communityViewer = new CommunityViewer();
    });
} else {
    window.communityViewer = new CommunityViewer();
}
