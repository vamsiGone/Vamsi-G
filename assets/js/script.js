'use strict';

// ---------- SHARED FLAGS ----------
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isFinePointer = window.matchMedia('(pointer: fine)').matches;
var hasGsap = !!window.gsap;
var hasScrollTrigger = hasGsap && !!window.ScrollTrigger;

if (hasScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}



// ---------- THEME TOGGLE ----------
var rootEl = document.documentElement;
var themeToggleBtn = document.getElementById('theme-toggle');

var setTheme = function (theme) {
  rootEl.setAttribute('data-theme', theme);
  rootEl.style.colorScheme = theme;
  try { localStorage.setItem('portfolio-theme', theme); } catch (e) { /* storage unavailable */ }
  if (themeToggleBtn) themeToggleBtn.setAttribute('aria-pressed', String(theme === 'light'));
  window.dispatchEvent(new CustomEvent('themechange'));
};

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', function () {
    var current = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(current);
  });
}



// ---------- LENIS SMOOTH SCROLL ----------
var lenis = null;

if (window.Lenis && !prefersReducedMotion) {
  lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
  if (!window.location.hash) {
    lenis.scrollTo(0, { immediate: true });
  }
  if (hasScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
  }
  if (hasGsap) {
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })();
  }
}



// ---------- SMOOTH ANCHOR NAVIGATION ----------
var navbarEl = document.querySelector('[data-navbar]');

var navbarOffset = function () {
  return navbarEl ? navbarEl.offsetHeight + 12 : 0;
};

var closeMobileMenu = function () {
  rootEl.classList.remove('menu-open');
  var menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
};

var jumpToTarget = function (target, opts) {
  opts = opts || {};
  if (lenis) {
    lenis.scrollTo(target, {
      offset: -navbarOffset(),
      immediate: opts.immediate || false,
      duration: opts.immediate ? undefined : (opts.duration || 1.5)
    });
  } else {
    var top = target.getBoundingClientRect().top + window.pageYOffset - navbarOffset();
    window.scrollTo({ top: top, behavior: (prefersReducedMotion || opts.immediate) ? 'auto' : 'smooth' });
  }
};



// ---------- NAV LINK CLICK: slow scroll to target section ----------
document.querySelectorAll('[data-section-link]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    var id = this.dataset.target;
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMobileMenu();
    jumpToTarget(target, { duration: 1.5 });
  });
});



// ---------- MOBILE MENU ----------
var menuToggleBtn = document.getElementById('menu-toggle');

if (menuToggleBtn) {
  menuToggleBtn.addEventListener('click', function () {
    var isOpen = rootEl.classList.contains('menu-open');
    if (isOpen) {
      closeMobileMenu();
    } else {
      rootEl.classList.add('menu-open');
      menuToggleBtn.setAttribute('aria-expanded', 'true');
    }
  });
}

document.querySelectorAll('[data-nav-close]').forEach(function (el) {
  el.addEventListener('click', closeMobileMenu);
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeMobileMenu();
});



// ---------- SCROLL-DRIVEN CHROME: navbar state, progress bar, back-to-top ----------
var progressFill = document.querySelector('[data-scroll-progress-fill]');
var backToTopBtn = document.querySelector('[data-back-to-top]');

var updateScrollChrome = function () {
  var scrollY = window.scrollY || window.pageYOffset;

  if (navbarEl) navbarEl.classList.toggle('scrolled', scrollY > 60);
  if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 600);

  if (progressFill) {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;
    progressFill.style.transform = 'scaleX(' + progress + ')';
  }
};

window.addEventListener('scroll', updateScrollChrome, { passive: true });
if (lenis) lenis.on('scroll', updateScrollChrome);
updateScrollChrome();

if (backToTopBtn) {
  backToTopBtn.addEventListener('click', function () {
    if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  });
}



// ---------- ACTIVE NAV SECTION + SLIDING PILL ----------
var navPill = document.querySelector('[data-nav-pill]');
var sectionIds = ['about', 'skills', 'resume', 'projects', 'contact'];

var moveNavPill = function () {
  if (!navPill) return;
  var activeLink = document.querySelector('.nav-links .nav-link.active');
  if (!activeLink) {
    navPill.style.opacity = '0';
    return;
  }
  navPill.style.opacity = '1';
  navPill.style.width = activeLink.offsetWidth + 'px';
  navPill.style.height = activeLink.offsetHeight + 'px';
  navPill.style.transform = 'translate(' + activeLink.offsetLeft + 'px, ' + activeLink.offsetTop + 'px)';
};

var setActiveNav = function (id) {
  document.querySelectorAll('.nav-links .nav-link').forEach(function (link) {
    link.classList.toggle('active', link.dataset.target === id);
  });
  moveNavPill();
};

if (hasScrollTrigger) {
  sectionIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top center',
      end: 'bottom center',
      onToggle: function (self) { if (self.isActive) setActiveNav(id); }
    });
  });
}

window.addEventListener('resize', moveNavPill);
window.addEventListener('load', moveNavPill);



// ---------- HERO ENTRANCE ----------
var heroInEls = document.querySelectorAll('[data-hero-in]');

if (hasGsap && !prefersReducedMotion) {
  gsap.to(heroInEls, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.15 });
} else {
  heroInEls.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
}



// ---------- SCROLL REVEAL ----------
var revealEls = document.querySelectorAll('[data-reveal]');

if (hasScrollTrigger && !prefersReducedMotion) {
  revealEls.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentElement ? el.parentElement.children : [], function (c) {
      return c.hasAttribute && c.hasAttribute('data-reveal');
    });
    var idx = siblings.indexOf(el);

    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: Math.min(Math.max(idx, 0), 6) * 0.07,
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });
} else {
  revealEls.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
}

window.addEventListener('load', function () {
  if (hasScrollTrigger) ScrollTrigger.refresh();
});



// ---------- ANIMATED COUNTERS ----------
document.querySelectorAll('[data-counter]').forEach(function (el) {
  var target = parseFloat(el.dataset.countTo || '0');

  if (hasScrollTrigger && !prefersReducedMotion) {
    var obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: function () {
        gsap.to(obj, {
          val: target, duration: 1.4, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(obj.val); }
        });
      }
    });
  } else {
    el.textContent = target;
  }
});



// ---------- TILT + SPOTLIGHT ----------
var applyTilt = function (el, maxTilt) {
  el.addEventListener('mousemove', function (e) {
    var rect = el.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width - 0.5;
    var py = (e.clientY - rect.top) / rect.height - 0.5;

    el.style.transform = 'perspective(700px) rotateX(' + (-py * maxTilt).toFixed(2) + 'deg) rotateY(' + (px * maxTilt).toFixed(2) + 'deg) translateZ(0)';
    el.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
    el.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
  });

  el.addEventListener('mouseleave', function () { el.style.transform = ''; });
};

if (isFinePointer && !prefersReducedMotion) {
  document.querySelectorAll('[data-tilt]').forEach(function (el) { applyTilt(el, 7); });
}



// ---------- MAGNETIC BUTTONS ----------
var applyMagnetic = function (el, strength) {
  el.addEventListener('mousemove', function (e) {
    var rect = el.getBoundingClientRect();
    var x = (e.clientX - rect.left - rect.width / 2) * strength;
    var y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px)';
  });
  el.addEventListener('mouseleave', function () { el.style.transform = ''; });
};

if (isFinePointer && !prefersReducedMotion) {
  document.querySelectorAll('.btn, .social-icon, [data-magnetic]').forEach(function (el) { applyMagnetic(el, 0.25); });
  if (themeToggleBtn) applyMagnetic(themeToggleBtn, 0.3);
  if (backToTopBtn) applyMagnetic(backToTopBtn, 0.3);
}



// ---------- GRADIENT CURSOR TRAIL (native pointer stays visible) ----------
var cursorTrail = document.querySelector('[data-cursor-trail]');

if (cursorTrail && isFinePointer && !prefersReducedMotion) {
  var trailSpecs = [
    { size: 52, color: 'var(--aurora-1)', opacity: 0.38 },
    { size: 40, color: 'var(--aurora-2)', opacity: 0.28 },
    { size: 30, color: 'var(--aurora-3)', opacity: 0.2 },
    { size: 20, color: 'var(--aurora-2)', opacity: 0.12 }
  ];

  var trailBlobs = trailSpecs.map(function (spec) {
    var blob = document.createElement('span');
    blob.className = 'cursor-blob';
    blob.style.width = spec.size + 'px';
    blob.style.height = spec.size + 'px';
    blob.style.marginLeft = (-spec.size / 2) + 'px';
    blob.style.marginTop = (-spec.size / 2) + 'px';
    blob.style.background = 'radial-gradient(circle, ' + spec.color + ', transparent 70%)';
    blob.style.setProperty('--blob-opacity', spec.opacity);
    cursorTrail.appendChild(blob);
    return blob;
  });

  var lastX = window.innerWidth / 2;
  var lastY = window.innerHeight / 2;
  var trailShown = false;

  var moveTrail;
  if (hasGsap) {
    var blobMovers = trailBlobs.map(function (blob, i) {
      var duration = 0.2 + i * 0.13;
      return { x: gsap.quickTo(blob, 'x', { duration: duration, ease: 'power3' }), y: gsap.quickTo(blob, 'y', { duration: duration, ease: 'power3' }) };
    });
    moveTrail = function (x, y) {
      blobMovers.forEach(function (mover) { mover.x(x); mover.y(y); });
    };
  } else {
    var trailPos = trailBlobs.map(function () { return { x: lastX, y: lastY }; });
    moveTrail = function () {};
    (function trailLoop() {
      trailPos.forEach(function (pos, i) {
        var ease = Math.max(0.22 - i * 0.04, 0.08);
        pos.x += (lastX - pos.x) * ease;
        pos.y += (lastY - pos.y) * ease;
        trailBlobs[i].style.transform = 'translate(' + pos.x + 'px, ' + pos.y + 'px)';
      });
      requestAnimationFrame(trailLoop);
    })();
  }

  window.addEventListener('mousemove', function (e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (!trailShown) {
      trailShown = true;
      rootEl.classList.add('cursor-visible');
    }
    if (hasGsap) moveTrail(lastX, lastY);
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    trailShown = false;
    rootEl.classList.remove('cursor-visible');
  });
}



// ---------- PROJECT FILTER ----------
var filterBtns = document.querySelectorAll('[data-filter-btn]');
var filterItems = document.querySelectorAll('[data-filter-item]');

filterBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var value = this.textContent.trim().toLowerCase();

    filterBtns.forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');

    filterItems.forEach(function (item) {
      var show = value === 'all' || item.dataset.category === value;
      item.classList.toggle('active', show);
    });

    if (hasScrollTrigger) ScrollTrigger.refresh();
  });
});



// ---------- PROJECT CARDS: hover preview + detail modal ----------
var projectCards = document.querySelectorAll('.project-card');

var splitList = function (str, sep) {
  return (str || '').split(sep).map(function (s) { return s.trim(); }).filter(Boolean);
};

projectCards.forEach(function (card) {
  var media = card.querySelector('.project-media');
  if (!media) return;

  var tags = splitList(card.dataset.projectTags, ',');
  var hoverInfo = document.createElement('div');
  hoverInfo.className = 'project-hover-info';

  var desc = document.createElement('p');
  desc.className = 'project-hover-desc';
  desc.textContent = card.dataset.projectDesc || '';
  hoverInfo.appendChild(desc);

  if (tags.length) {
    var tagWrap = document.createElement('div');
    tagWrap.className = 'project-hover-tags';
    tags.slice(0, 4).forEach(function (t) {
      var tag = document.createElement('span');
      tag.className = 'project-tag';
      tag.textContent = t;
      tagWrap.appendChild(tag);
    });
    hoverInfo.appendChild(tagWrap);
  }

  media.appendChild(hoverInfo);

  var inner = card.querySelector('.project-card-inner');
  if (inner) {
    inner.setAttribute('tabindex', '0');
    inner.setAttribute('role', 'button');
    inner.setAttribute('aria-haspopup', 'dialog');
  }
});

var projectModalOverlay = document.querySelector('[data-project-modal-overlay]');
var projectModalEl = document.querySelector('[data-project-modal]');
var projectModalImg = document.querySelector('[data-project-modal-img]');
var projectModalCategory = document.querySelector('[data-project-modal-category]');
var projectModalTitle = document.querySelector('[data-project-modal-title]');
var projectModalDesc = document.querySelector('[data-project-modal-desc]');
var projectModalTags = document.querySelector('[data-project-modal-tags]');
var projectModalRole = document.querySelector('[data-project-modal-role]');
var projectModalResponsibilities = document.querySelector('[data-project-modal-responsibilities]');
var projectModalCloseBtn = document.querySelector('[data-project-modal-close]');
var lastFocusedProjectCard = null;

var openProjectModal = function (card) {
  if (!projectModalOverlay) return;

  var img = card.querySelector('.project-media img');
  var title = card.querySelector('.project-info h3');
  var category = card.querySelector('.project-info p');

  if (projectModalImg && img) { projectModalImg.src = img.src; projectModalImg.alt = img.alt; }
  if (projectModalCategory && category) projectModalCategory.textContent = category.textContent;
  if (projectModalTitle && title) projectModalTitle.textContent = title.textContent;
  if (projectModalDesc) projectModalDesc.textContent = card.dataset.projectDesc || '';
  if (projectModalRole) projectModalRole.textContent = card.dataset.projectRole || '';

  if (projectModalTags) {
    projectModalTags.innerHTML = '';
    splitList(card.dataset.projectTags, ',').forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      projectModalTags.appendChild(li);
    });
  }

  if (projectModalResponsibilities) {
    projectModalResponsibilities.innerHTML = '';
    splitList(card.dataset.projectResponsibilities, '|').forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      projectModalResponsibilities.appendChild(li);
    });
  }

  lastFocusedProjectCard = card;
  rootEl.classList.add('project-modal-open');
  if (lenis) lenis.stop();
  if (projectModalEl) projectModalEl.focus();
};

var closeProjectModal = function () {
  if (!rootEl.classList.contains('project-modal-open')) return;
  rootEl.classList.remove('project-modal-open');
  if (lenis) lenis.start();
  if (lastFocusedProjectCard) lastFocusedProjectCard.focus();
};

projectCards.forEach(function (card) {
  card.addEventListener('click', function () { openProjectModal(card); });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProjectModal(card);
    }
  });
});

if (projectModalCloseBtn) projectModalCloseBtn.addEventListener('click', closeProjectModal);

if (projectModalOverlay) {
  projectModalOverlay.addEventListener('click', function (e) {
    if (e.target === projectModalOverlay) closeProjectModal();
  });
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeProjectModal();
});



// ---------- TYPEWRITER ----------
var typewriterEl = document.getElementById('typewriter');
var typewriterRoles = ['Software Engineer', 'Problem Solver', 'Systems Builder'];

if (typewriterEl && !prefersReducedMotion) {
  var roleIndex = 0;
  var charIndex = 0;
  var deleting = false;
  typewriterEl.textContent = '';

  var typeLoop = function () {
    var currentRole = typewriterRoles[roleIndex];

    if (!deleting) {
      charIndex++;
      typewriterEl.textContent = currentRole.slice(0, charIndex);
      if (charIndex === currentRole.length) {
        deleting = true;
        setTimeout(typeLoop, 1400);
        return;
      }
    } else {
      charIndex--;
      typewriterEl.textContent = currentRole.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % typewriterRoles.length;
      }
    }

    setTimeout(typeLoop, deleting ? 45 : 90);
  };

  typeLoop();
}



// ---------- FOOTER YEAR ----------
var yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
