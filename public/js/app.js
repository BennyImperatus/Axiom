document.addEventListener('DOMContentLoaded', () => {
  
  // =========================================================================
  // Mobile Navigation Drawer Toggle
  // =========================================================================
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const menuIcon = document.getElementById('menu-icon');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  function toggleMobileMenu() {
    const isOpen = mobileDrawer.classList.contains('translate-x-0');
    if (isOpen) {
      mobileDrawer.classList.remove('translate-x-0');
      mobileDrawer.classList.add('translate-x-full');
      menuIcon.setAttribute('data-lucide', 'menu');
    } else {
      mobileDrawer.classList.remove('translate-x-full');
      mobileDrawer.classList.add('translate-x-0');
      menuIcon.setAttribute('data-lucide', 'x');
    }
    // Re-render menu icon changes
    lucide.createIcons();
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
  }

  // Close drawer when clicking a mobile nav link
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileDrawer.classList.contains('translate-x-0')) {
        toggleMobileMenu();
      }
    });
  });

  // =========================================================================
  // Sticky Navbar Blur and Shadow styling on scroll
  // =========================================================================
  const navbar = document.getElementById('navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('bg-slate-950/80', 'backdrop-blur-md', 'border-slate-900', 'shadow-lg', 'shadow-slate-950/50');
      navbar.classList.remove('py-4', 'border-transparent');
      navbar.classList.add('py-3');
    } else {
      navbar.classList.remove('bg-slate-950/80', 'backdrop-blur-md', 'border-slate-900', 'shadow-lg', 'shadow-slate-950/50', 'py-3');
      navbar.classList.add('py-4', 'border-transparent');
    }
  });

  // =========================================================================
  // Hero Dashboard Visual Entrance
  // =========================================================================
  const heroDashboard = document.getElementById('hero-dashboard');
  if (heroDashboard) {
    setTimeout(() => {
      heroDashboard.classList.remove('opacity-0', 'translate-y-12');
      heroDashboard.classList.add('opacity-100', 'translate-y-0');
    }, 200);
  }

  // =========================================================================
  // Statistics Counter Animation
  // =========================================================================
  const statsElements = document.querySelectorAll('[data-target]');
  let startedCounting = false;

  function countUp(el) {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const duration = 1500; // Total count-up duration in ms
    const increment = target / (duration / 16); // ~60fps
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target + (el.getAttribute('data-target') === '98' ? '%' : '+');
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current) + '+';
      }
    }, 16);
  }

  // Trigger counters when Stats section is in view
  const aboutSection = document.getElementById('about');
  if (aboutSection && statsElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !startedCounting) {
          startedCounting = true;
          statsElements.forEach(countUp);
        }
      });
    }, { threshold: 0.3 });
    
    observer.observe(aboutSection);
  }

  // =========================================================================
  // Scroll Reveal Animations
  // =========================================================================
  const revealElements = document.querySelectorAll('.glass, .glass-card, #services h2, #plans h2, #projects h2, #testimonials h2');
  
  // Set initial hidden classes
  revealElements.forEach(el => {
    // Avoid hiding hero items or items inside the dashboard mockup
    if (!el.closest('#hero-dashboard') && !el.closest('header')) {
      el.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-700', 'ease-out');
    }
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('opacity-0', 'translate-y-8');
        entry.target.classList.add('opacity-100', 'translate-y-0');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealElements.forEach(el => {
    if (!el.closest('#hero-dashboard') && !el.closest('header')) {
      revealObserver.observe(el);
    }
  });

  // =========================================================================
  // Contact Form AJAX Submission
  // =========================================================================
  const contactForm = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const notification = document.getElementById('form-notification');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear previous notifications
      notification.className = 'hidden p-4 rounded-xl text-sm border font-medium';
      notification.textContent = '';

      // Get Form Values
      const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        studio: document.getElementById('studio').value.trim(),
        discord: document.getElementById('discord').value.trim(),
        message: document.getElementById('message').value.trim()
      };

      // client-side validation check
      if (!formData.name || !formData.email || !formData.studio || !formData.message) {
        showNotification('Please fill in all required fields.', 'error');
        return;
      }

      // Show Loading State
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Submitting...</span>
      `;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showNotification(result.message || 'Your inquiry was sent successfully!', 'success');
          contactForm.reset();
        } else {
          showNotification(result.error || 'Something went wrong. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Submission error:', error);
        showNotification('Unable to connect to the server. Please check your internet connection and try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }

  function showNotification(text, type) {
    notification.classList.remove('hidden');
    notification.textContent = text;
    
    if (type === 'success') {
      notification.classList.add('bg-emerald-500/10', 'border-emerald-500/20', 'text-emerald-400');
    } else {
      notification.classList.add('bg-rose-500/10', 'border-rose-500/20', 'text-rose-400');
    }
  }

});
