(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.querySelector('[data-reading-progress]');
  let frame = null;

  const updateProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    frame = null;
  };

  const requestProgress = () => {
    if (frame === null) frame = window.requestAnimationFrame(updateProgress);
  };

  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress, { passive: true });
  updateProgress();

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const siteNav = document.querySelector('[data-site-nav]');
  if (siteNav) {
    const navSearch = siteNav.querySelector('[data-site-nav-search]');
    const navItems = [...siteNav.querySelectorAll('[data-site-nav-item]')];
    const navCount = siteNav.querySelector('[data-site-nav-count]');
    const navEmpty = siteNav.querySelector('[data-site-nav-empty]');
    const navTriggers = [...document.querySelectorAll('[data-site-nav-open]')];
    const themeToggle = document.querySelector('[data-site-theme-toggle]');
    const syncThemeToggle = () => {
      if (!themeToggle) return;
      const dark = document.body.getAttribute('theme') === 'dark';
      const label = dark ? '白天' : '黑夜';
      const action = dark ? '切换到白天模式' : '切换到黑夜模式';
      themeToggle.querySelector('i').className = dark ? 'fas fa-sun' : 'fas fa-moon';
      themeToggle.querySelector('[data-site-theme-label]').textContent = label;
      themeToggle.setAttribute('aria-label', action);
      themeToggle.title = action;
    };
    new MutationObserver(syncThemeToggle).observe(document.body, { attributes: true, attributeFilter: ['theme'] });
    syncThemeToggle();
    let navReturnFocus = null;

    const visibleNavItems = () => navItems.filter((item) => !item.hidden);
    const filterNav = () => {
      const query = navSearch.value.trim().toLowerCase();
      let count = 0;
      navItems.forEach((item, index) => {
        const visible = query ? item.dataset.search.includes(query) : index < 6;
        item.hidden = !visible;
        if (visible) count += 1;
      });
      navCount.textContent = query ? `${count} 篇匹配` : '最近记录';
      navEmpty.hidden = count !== 0;
    };
    const openNav = (query = '') => {
      if (siteNav.open) {
        if (query) {
          navSearch.value = query;
          filterNav();
        }
        return;
      }
      navReturnFocus = document.activeElement;
      navSearch.value = query;
      filterNav();
      siteNav.showModal();
      document.body.classList.add('nav-open');
      window.requestAnimationFrame(() => navSearch.focus());
    };
    const closeNav = () => {
      if (siteNav.open) siteNav.close();
    };

    navTriggers.forEach((trigger) => trigger.addEventListener('click', openNav));
    siteNav.querySelector('[data-site-nav-close]').addEventListener('click', closeNav);
    siteNav.addEventListener('close', () => {
      document.body.classList.remove('nav-open');
      navReturnFocus?.focus({ preventScroll: true });
    });
    siteNav.addEventListener('click', (event) => {
      if (event.target !== siteNav) return;
      const rect = siteNav.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeNav();
    });
    navSearch.addEventListener('input', filterNav);
    navSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeNav();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const items = visibleNavItems();
        const target = event.key === 'ArrowDown' ? items[0] : items[items.length - 1];
        target?.focus();
      }
    });
    navItems.forEach((item) => item.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = visibleNavItems();
      const index = items.indexOf(item);
      if (event.key === 'Home') items[0]?.focus();
      else if (event.key === 'End') items[items.length - 1]?.focus();
      else if (event.key === 'ArrowDown') items[(index + 1) % items.length]?.focus();
      else if (index === 0) navSearch.focus();
      else items[index - 1]?.focus();
    }));
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (siteNav.open) closeNav();
        else openNav();
      }
    });
    const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim();
    if (initialQuery && document.body.dataset.page === 'journal') {
      openNav(initialQuery);
      history.replaceState(null, '', window.location.pathname);
    }
  }

  const page = document.querySelector('[data-notes-page]');
  if (!page) return;

  const entries = [...page.querySelectorAll('[data-notes-entry]')].map((element) => ({
    element,
    date: element.dataset.date,
    year: element.dataset.date.slice(0, 4),
    month: element.dataset.date.slice(0, 7),
    searchText: `${element.dataset.date} ${element.textContent}`.toLowerCase(),
  }));
  const filters = [...page.querySelectorAll('[data-notes-year-filter]')];
  const search = page.querySelector('[data-notes-search]');
  const searchClear = page.querySelector('[data-notes-search-clear]');
  const resetButtons = [...page.querySelectorAll('[data-notes-reset], [data-notes-empty-reset]')];
  const visibleStatus = page.querySelector('[data-notes-visible-status]');
  const status = page.querySelector('[data-notes-status]');
  const stream = page.querySelector('.timeline-stream');
  const empty = page.querySelector('[data-notes-empty]');
  const densityButton = page.querySelector('[data-notes-density]');
  const tools = page.querySelector('[data-notes-tools]');
  const state = { year: 'all', query: '' };
  let activeDate = '';
  let rulerDragging = false;

  const setActiveDate = (date) => {
    if (!entries.some((entry) => entry.date === date)) return;
    activeDate = date;
    entries.forEach((entry) => entry.element.classList.toggle('is-current', entry.date === date));
    syncRuler();
  };

  const selects = [...page.querySelectorAll('[data-notes-select]')].map((select) => {
    const type = select.dataset.notesSelect;
    const trigger = select.querySelector('[data-notes-select-trigger]');
    const value = select.querySelector('[data-notes-select-value]');
    const menu = select.querySelector('[data-notes-select-menu]');
    const options = [...select.querySelectorAll('[data-notes-option]')];
    const visibleOptions = () => options.filter((option) => !option.hidden);

    const setValue = (nextValue) => {
      const selected = options.find((option) => option.dataset.notesOption === nextValue);
      if (!selected) return;
      options.forEach((option) => option.setAttribute('aria-selected', String(option === selected)));
      value.textContent = selected.querySelector('span').textContent;
    };

    const highlight = (option) => {
      options.forEach((item) => item.classList.toggle('is-active', item === option));
      if (!option) return;
      menu.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    };

    const close = (restoreFocus = false) => {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    };

    const open = () => {
      selects.forEach((item) => {
        if (item.select !== select) item.close();
      });
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      const selected = options.find((option) => option.getAttribute('aria-selected') === 'true' && !option.hidden);
      highlight(selected || visibleOptions()[0]);
      menu.focus();
    };

    const choose = (option) => {
      if (!option) return;
      const nextValue = option.dataset.notesOption;
      setValue(nextValue);
      close(true);
      if (!nextValue) return;
      if (type === 'day') setActiveDate(nextValue);
      history.replaceState(null, '', `#${nextValue}`);
      jumpTo(document.getElementById(nextValue));
    };

    const filterOptions = (year) => {
      options.forEach((option) => {
        const optionValue = option.dataset.notesOption;
        option.hidden = year !== 'all' && optionValue !== '' && !optionValue.startsWith(year);
      });
      const selected = options.find((option) => option.getAttribute('aria-selected') === 'true');
      if (selected?.hidden) setValue('');
      close();
    };

    trigger.addEventListener('click', () => {
      if (menu.hidden) open();
      else close(true);
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
      }
    });
    options.forEach((option) => {
      option.addEventListener('click', () => choose(option));
      option.addEventListener('pointermove', () => highlight(option));
    });
    menu.addEventListener('keydown', (event) => {
      const available = visibleOptions();
      const current = Math.max(0, available.findIndex((option) => option.classList.contains('is-active')));
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        highlight(available[(current + direction + available.length) % available.length]);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        highlight(event.key === 'Home' ? available[0] : available[available.length - 1]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose(available[current]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      } else if (event.key === 'Tab') {
        close();
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!select.contains(event.target)) close();
    });

    return { select, close, filterOptions };
  });

  const ruler = page.querySelector('[data-notes-ruler]');
  const rulerWrap = page.querySelector('[data-notes-ruler-wrap]');
  const rulerOutput = page.querySelector('[data-notes-ruler-current]');
  const rulerTooltip = page.querySelector('[data-notes-ruler-tooltip]');
  const rulerToggle = page.querySelector('[data-notes-ruler-toggle]');
  const rulerClose = page.querySelector('[data-notes-ruler-close]');
  const compactRuler = window.matchMedia('(max-width: 1100px)');
  const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' });
  let rulerEntries = entries;
  let ticks = [...ruler.children];
  let touchedTicks = [];
  let previewCoordinate = null;
  let previewFrame = null;
  let dragFrame = null;
  let dragStart = 0;
  let dragIndex = 0;
  let dragMoved = false;

  const closeRuler = (restoreFocus = false) => {
    page.dataset.rulerOpen = 'false';
    document.body.classList.remove('ruler-open');
    rulerToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) rulerToggle.focus({ preventScroll: true });
  };

  const clearPreview = () => {
    touchedTicks.forEach((tick) => tick.style.setProperty('--f', '0'));
    touchedTicks = [];
    previewCoordinate = null;
    if (previewFrame !== null) cancelAnimationFrame(previewFrame);
    previewFrame = null;
    rulerTooltip.hidden = true;
    rulerTooltip.dataset.visible = 'false';
  };

  function syncRuler() {
    const index = rulerEntries.findIndex((entry) => entry.date === activeDate);
    ticks.forEach((tick, tickIndex) => tick.classList.toggle('is-active', tickIndex === index));
    if (index < 0) {
      rulerOutput.value = '—';
      ruler.setAttribute('aria-valuenow', '0');
      ruler.setAttribute('aria-valuetext', '没有匹配记录');
      return;
    }
    rulerOutput.value = activeDate;
    ruler.setAttribute('aria-valuenow', String(index + 1));
    ruler.setAttribute('aria-valuetext', activeDate);
  }

  function renderRuler(nextEntries) {
    clearPreview();
    rulerEntries = nextEntries;
    const fragment = document.createDocumentFragment();
    let lastMonth = '';
    let lastYear = '';
    rulerEntries.forEach((entry) => {
      const monthStart = entry.month !== lastMonth;
      const yearStart = entry.year !== lastYear;
      const link = document.createElement('a');
      link.href = `#${entry.date}`;
      link.dataset.rulerDate = entry.date;
      link.tabIndex = -1;
      link.setAttribute('aria-label', entry.date);
      if (monthStart) link.classList.add('is-month-start');
      if (yearStart) link.classList.add('is-year-start');
      const mark = document.createElement('span');
      mark.className = 'timeline-ruler-mark';
      link.append(mark);
      if (monthStart) {
        const label = document.createElement('span');
        label.className = 'timeline-ruler-label';
        label.textContent = `${entry.month.slice(5)}月`;
        link.append(label);
      }
      fragment.append(link);
      lastMonth = entry.month;
      lastYear = entry.year;
    });
    ruler.replaceChildren(fragment);
    ticks = [...ruler.children];
    ruler.setAttribute('aria-valuemax', String(rulerEntries.length));
    ruler.setAttribute('aria-disabled', String(rulerEntries.length === 0));
    rulerWrap.dataset.empty = String(rulerEntries.length === 0);
    rulerToggle.hidden = rulerEntries.length === 0;
    if (!rulerEntries.length) closeRuler();
    if (activeDate && !rulerEntries.some((entry) => entry.date === activeDate) && rulerEntries.length) {
      setActiveDate(rulerEntries[0].date);
    } else {
      syncRuler();
    }
  }

  const rulerMetrics = () => {
    const rect = ruler.getBoundingClientRect();
    const horizontal = compactRuler.matches;
    return {
      rect,
      horizontal,
      start: horizontal ? rect.left : rect.top,
      size: horizontal ? rect.width : rect.height,
    };
  };

  const indexAt = (coordinate) => {
    const { start, size } = rulerMetrics();
    if (!rulerEntries.length || size <= 0) return -1;
    const ratio = (coordinate - start) / size;
    return Math.max(0, Math.min(rulerEntries.length - 1, Math.floor(ratio * rulerEntries.length)));
  };

  const previewAt = (coordinate) => {
    previewFrame = null;
    if (previewCoordinate === null || !rulerEntries.length) return;
    const { rect, horizontal, start, size } = rulerMetrics();
    const center = indexAt(previewCoordinate);
    if (center < 0) return;
    touchedTicks.forEach((tick) => tick.style.setProperty('--f', '0'));
    touchedTicks = [];
    const radius = 62;
    const cell = size / rulerEntries.length;
    const span = Math.max(1, Math.ceil(radius / cell));
    for (let index = Math.max(0, center - span); index <= Math.min(ticks.length - 1, center + span); index += 1) {
      const position = start + (index + 0.5) * cell;
      const distance = Math.abs(position - previewCoordinate) / radius;
      if (distance >= 1) continue;
      const strength = (Math.cos(distance * Math.PI) + 1) / 2;
      ticks[index].style.setProperty('--f', strength.toFixed(3));
      touchedTicks.push(ticks[index]);
    }
    const entry = rulerEntries[center];
    rulerTooltip.querySelector('strong').textContent = entry.date;
    rulerTooltip.querySelector('span').textContent = weekdayFormatter.format(new Date(`${entry.date}T00:00:00`));
    const position = start + (center + 0.5) * cell;
    if (horizontal) {
      rulerTooltip.style.left = `${Math.max(88, Math.min(window.innerWidth - 88, position))}px`;
      rulerTooltip.style.top = `${rect.top - 10}px`;
    } else {
      rulerTooltip.style.left = `${rulerWrap.getBoundingClientRect().right + 8}px`;
      rulerTooltip.style.top = `${Math.max(30, Math.min(window.innerHeight - 30, position))}px`;
    }
    rulerTooltip.hidden = false;
    rulerTooltip.dataset.visible = 'true';
  };

  const schedulePreview = (coordinate) => {
    previewCoordinate = coordinate;
    if (previewFrame === null) previewFrame = requestAnimationFrame(previewAt);
  };

  const goToRulerIndex = (index, smooth = true) => {
    const entry = rulerEntries[index];
    if (!entry) return;
    setActiveDate(entry.date);
    history.replaceState(null, '', `#${entry.date}`);
    jumpTo(entry.element, smooth, false, false);
    ruler.focus({ preventScroll: true });
    if (smooth && compactRuler.matches) closeRuler(true);
  };

  const flushDrag = () => {
    dragFrame = null;
    if (rulerDragging && dragMoved) goToRulerIndex(dragIndex, false);
  };

  ruler.addEventListener('click', (event) => event.preventDefault());
  ruler.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !rulerEntries.length) return;
    const { horizontal } = rulerMetrics();
    dragStart = horizontal ? event.clientX : event.clientY;
    dragIndex = indexAt(dragStart);
    dragMoved = false;
    rulerDragging = true;
    rulerWrap.classList.add('is-dragging');
    ruler.setPointerCapture(event.pointerId);
    schedulePreview(dragStart);
    event.preventDefault();
  });
  ruler.addEventListener('pointermove', (event) => {
    const { horizontal } = rulerMetrics();
    const coordinate = horizontal ? event.clientX : event.clientY;
    schedulePreview(coordinate);
    if (!rulerDragging) return;
    if (Math.abs(coordinate - dragStart) > 4) dragMoved = true;
    if (!dragMoved) return;
    dragIndex = indexAt(coordinate);
    if (dragFrame === null) dragFrame = requestAnimationFrame(flushDrag);
  });
  ruler.addEventListener('pointerleave', () => {
    if (!rulerDragging) clearPreview();
  });

  const finishDrag = (event, cancelled = false) => {
    if (!rulerDragging) return;
    if (dragFrame !== null) cancelAnimationFrame(dragFrame);
    dragFrame = null;
    rulerDragging = false;
    rulerWrap.classList.remove('is-dragging');
    if (ruler.hasPointerCapture(event.pointerId)) ruler.releasePointerCapture(event.pointerId);
    if (!cancelled) goToRulerIndex(dragIndex, !dragMoved);
    clearPreview();
  };
  ruler.addEventListener('pointerup', (event) => finishDrag(event));
  ruler.addEventListener('pointercancel', (event) => finishDrag(event, true));
  ruler.addEventListener('keydown', (event) => {
    if (!rulerEntries.length) return;
    const current = Math.max(0, rulerEntries.findIndex((entry) => entry.date === activeDate));
    const moves = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1, PageUp: -10, PageDown: 10 };
    if (event.key in moves) {
      event.preventDefault();
      goToRulerIndex(Math.max(0, Math.min(rulerEntries.length - 1, current + moves[event.key])), true);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goToRulerIndex(event.key === 'Home' ? 0 : rulerEntries.length - 1, true);
    } else if (event.key === 'Escape' && compactRuler.matches) {
      event.preventDefault();
      closeRuler(true);
    }
  });

  rulerToggle.addEventListener('click', () => {
    if (page.dataset.rulerOpen === 'true') closeRuler(true);
    else {
      page.dataset.rulerOpen = 'true';
      document.body.classList.add('ruler-open');
      rulerToggle.setAttribute('aria-expanded', 'true');
      ruler.focus({ preventScroll: true });
    }
  });
  rulerClose.addEventListener('click', () => closeRuler(true));
  document.addEventListener('pointerdown', (event) => {
    if (!compactRuler.matches || page.dataset.rulerOpen !== 'true') return;
    if (!rulerWrap.contains(event.target) && !rulerToggle.contains(event.target)) closeRuler();
  });
  const updateRulerOrientation = () => {
    ruler.setAttribute('aria-orientation', compactRuler.matches ? 'horizontal' : 'vertical');
    clearPreview();
    closeRuler();
  };
  compactRuler.addEventListener('change', updateRulerOrientation);
  updateRulerOrientation();

  const applyFilters = () => {
    cancelJumpAlignment();
    let count = 0;
    const visibleEntries = [];
    entries.forEach((entry) => {
      const matchesYear = state.year === 'all' || entry.year === state.year;
      const matchesQuery = !state.query || entry.searchText.includes(state.query);
      const visible = matchesYear && matchesQuery;
      entry.element.hidden = !visible;
      if (visible) {
        count += 1;
        visibleEntries.push(entry);
      }
    });
    filters.forEach((button) => {
      const active = button.dataset.notesYearFilter === state.year;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    selects.forEach((select) => select.filterOptions(state.year));
    renderRuler(visibleEntries);
    stream.hidden = count === 0;
    empty.hidden = count !== 0;
    searchClear.hidden = !state.query;
    const message = state.query
      ? `找到 ${count} 条记录`
      : `${state.year === 'all' ? '全部' : `${state.year} 年`} · ${count} 条记录`;
    visibleStatus.textContent = message;
    status.textContent = message;
    resetButtons.forEach((button) => {
      if (button.matches('[data-notes-empty-reset]')) return;
      button.hidden = state.year === 'all' && !state.query;
    });
  };

  let jumpDestination = null;
  let jumpFrame = null;
  let jumpAlignAt = 0;
  let jumpClearTimer = null;

  const scheduleJumpAlignment = () => {
    if (!jumpDestination || jumpFrame !== null || performance.now() < jumpAlignAt) return;
    jumpFrame = window.requestAnimationFrame(() => {
      jumpFrame = null;
      if (!jumpDestination) return;
      const offset = jumpDestination.getBoundingClientRect().top - window.innerHeight * 0.3;
      if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'instant' });
      if (jumpDestination.matches('[data-notes-entry]')) setActiveDate(jumpDestination.dataset.date);
    });
  };

  const maintainJumpTarget = (destination, behavior) => {
    jumpDestination = destination;
    jumpAlignAt = performance.now() + (behavior === 'smooth' ? 550 : 0);
    if (jumpClearTimer !== null) window.clearTimeout(jumpClearTimer);
    jumpClearTimer = window.setTimeout(() => {
      jumpDestination = null;
      jumpClearTimer = null;
    }, 5000);
    window.setTimeout(scheduleJumpAlignment, behavior === 'smooth' ? 550 : 0);
    [300, 900, 1800, 3500].forEach((delay) => window.setTimeout(scheduleJumpAlignment, delay));
  };

  const cancelJumpAlignment = () => {
    jumpDestination = null;
    if (jumpFrame !== null) window.cancelAnimationFrame(jumpFrame);
    jumpFrame = null;
  };
  window.addEventListener('wheel', cancelJumpAlignment, { passive: true });
  window.addEventListener('touchstart', cancelJumpAlignment, { passive: true });
  document.addEventListener('load', (event) => {
    if (event.target.matches?.('img, iframe')) scheduleJumpAlignment();
  }, true);

  const jumpTo = (target, smooth = true, reveal = true, focusTarget = true) => {
    if (!target) return;
    const entry = target.matches('[data-notes-entry]') ? target : target.closest('[data-notes-entry]');
    const destination = entry || target;
    if (reveal) {
      if (entry) {
        state.year = entry.dataset.date.slice(0, 4);
        state.query = '';
        search.value = '';
      }
      applyFilters();
    }
    const offset = destination.getBoundingClientRect().top - window.innerHeight * 0.3;
    const behavior = smooth && !reducedMotion.matches && Math.abs(offset) < 2500 ? 'smooth' : 'instant';
    window.scrollTo({ top: Math.max(0, window.scrollY + offset), behavior });
    if (focusTarget && entry) entry.focus({ preventScroll: true });
    maintainJumpTarget(destination, behavior);
  };

  filters.forEach((button) => button.addEventListener('click', () => {
    const year = button.dataset.notesYearFilter;
    state.year = year;
    applyFilters();
    history.replaceState(null, '', year === 'all' ? window.location.pathname : `#year-${year}`);
    jumpTo(year === 'all' ? tools : document.getElementById(`year-${year}`), true, false);
  }));

  search.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase();
    applyFilters();
  });
  search.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    state.query = '';
    search.value = '';
    applyFilters();
  });
  searchClear.addEventListener('click', () => {
    state.query = '';
    search.value = '';
    applyFilters();
    search.focus();
  });
  resetButtons.forEach((button) => button.addEventListener('click', () => {
    state.year = 'all';
    state.query = '';
    search.value = '';
    applyFilters();
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.querySelector('.lg-outer.lg-visible.lg-components-open')?.classList.remove('lg-components-open');
    }
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || siteNav?.open || document.querySelector('.lg-outer.lg-visible')) return;
    if (event.target.closest('input, textarea, select, [role="listbox"], [contenteditable="true"]')) return;
    event.preventDefault();
    tools.open = true;
    window.requestAnimationFrame(() => search.focus());
  });

  let savedDensity = '';
  try {
    savedDensity = localStorage.getItem('oweqian-notes-density');
  } catch {}
  const setDensity = (density) => {
    const compact = density === 'compact';
    page.dataset.density = compact ? 'compact' : 'comfortable';
    densityButton.setAttribute('aria-pressed', String(compact));
    densityButton.title = compact ? '切换为舒适阅读' : '切换为紧凑阅读';
    densityButton.querySelector('span').textContent = compact ? '舒适' : '紧凑';
    try {
      localStorage.setItem('oweqian-notes-density', compact ? 'compact' : 'comfortable');
    } catch {}
  };
  setDensity(savedDensity);
  densityButton.addEventListener('click', () => {
    setDensity(page.dataset.density === 'compact' ? 'comfortable' : 'compact');
  });

  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const currentObserver = new IntersectionObserver((observations) => {
      if (rulerDragging || jumpDestination) return;
      observations.forEach((observation) => {
        const entry = observation.target.closest('[data-notes-entry]');
        if (observation.isIntersecting) visible.add(entry.dataset.date);
        else visible.delete(entry.dataset.date);
      });
      const first = entries.find((entry) => !entry.element.hidden && visible.has(entry.date));
      if (first) setActiveDate(first.date);
    }, { rootMargin: '-25% 0px -45% 0px', threshold: 0 });
    entries.forEach((entry) => currentObserver.observe(entry.element.querySelector('.timeline-entry-header')));
  }

  const initialQuery = new URLSearchParams(window.location.search).get('q')?.trim();
  if (initialQuery) {
    tools.open = true;
    search.value = initialQuery;
    state.query = initialQuery.toLowerCase();
    applyFilters();
  }
  const initialTarget = window.location.hash ? document.getElementById(window.location.hash.slice(1)) : null;
  if (initialTarget) {
    window.requestAnimationFrame(() => jumpTo(initialTarget, false, !initialQuery));
  } else if (entries.length) {
    setActiveDate(entries[0].date);
  }
})();
