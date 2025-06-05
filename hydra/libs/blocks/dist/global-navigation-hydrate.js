import Gnav from './Gnav';
class GnavHydrate extends Gnav {
  _500({
    payload
  }) {
    payload = {
      ...payload,
      localNav,
      title,
      id: 500
    };
    localNav.querySelector('.feds-localnav-title').addEventListener('click', () => {
      localNav.classList.toggle('feds-localnav--active');
      const isActive = localNav.classList.contains('feds-localnav--active');
      localNav.querySelector('.feds-localnav-title').setAttribute('aria-expanded', isActive);
      localNav.querySelector('.feds-localnav-title').setAttribute('daa-ll', `${title}_localNav|${isActive ? 'close' : 'open'}`);
    });
  }
  _938({
    payload
  }) {
    payload = {
      ...payload,
      toggle,
      id: 938
    };
    toggle.addEventListener('click', () => logErrorFor(async () => {
      this.toggleMenuMobile();
      if (this.blocks?.search?.instance) {
        this.blocks.search.instance.clearSearchForm();
      } else {
        await this.loadSearch();
      }
      if (this.isToggleExpanded()) setHamburgerPadding();
    }, 'Toggle click failed', 'gnav', 'error'));
  }
  _1250({
    payload
  }) {
    payload = {
      ...payload,
      popup,
      isDesktop,
      id: 1250
    };
    isDesktop.addEventListener('change', async () => {
      enableMobileScroll();
      if (isDesktop.matches) {
        popup.innerHTML = originalContent;
        this.block.classList.remove('new-nav');
      } else {
        originalContent = await transformTemplateToMobile(popup, item, this.isLocalNav());
        popup.querySelector('.close-icon')?.addEventListener('click', this.toggleMenuMobile);
        this.block.classList.add('new-nav');
      }
    });
  }
  _1296({
    payload
  }) {
    payload = {
      ...payload,
      dropdownTrigger,
      isSectionMenu,
      id: 1296
    };
    dropdownTrigger.addEventListener('click', e => {
      if (!isDesktop.matches && this.newMobileNav && isSectionMenu) {
        const popup = dropdownTrigger.nextElementSibling;
        if (popup && this.isLocalNav()) {
          this.updatePopupPosition(popup);
        }
        makeTabActive(popup);
      } else if (isDesktop.matches && this.newMobileNav && isSectionMenu) {
        const popup = dropdownTrigger.nextElementSibling;
        if (popup) popup.style.removeProperty('top');
      }
      trigger({
        element: dropdownTrigger,
        event: e,
        type: 'dropdown'
      });
      setActiveDropdown(dropdownTrigger);
    });
  }
  toggleMenuMobile = () => {
    const toggle = this.elements.mobileToggle;
    const isExpanded = this.isToggleExpanded();
    if (!isExpanded && this.newMobileNav) {
      const sections = document.querySelectorAll('header.new-nav .feds-nav > section.feds-navItem > button.feds-navLink');
      animateInSequence(sections, 0.075);
      if (this.isLocalNav() && this.hasMegaMenu()) {
        disableMobileScroll();
        const section = sections[0];
        queueMicrotask(() => section.click());
      }
    } else if (isExpanded && this.isLocalNav()) {
      enableMobileScroll();
    }
    toggle?.setAttribute('aria-expanded', !isExpanded);
    document.body.classList.toggle('disable-scroll', !isExpanded);
    this.elements.navWrapper?.classList?.toggle('feds-nav-wrapper--expanded', !isExpanded);
    closeAllDropdowns();
    setCurtainState(!isExpanded);
    toggle?.setAttribute('daa-ll', `hamburgermenu|${isExpanded ? 'open' : 'close'}`);
  };
  loadSearch = () => {
    const instanceAlreadyExists = !!this.blocks?.search?.instance;
    const searchNotInContent = !this.searchPresent();
    if (instanceAlreadyExists || searchNotInContent) return null;
    return this.loadDelayed().then(() => {
      this.blocks.search.instance = new this.Search(this.blocks.search.config);
    }).catch(() => {});
  };
  isToggleExpanded = () => this.elements.mobileToggle?.getAttribute('aria-expanded') === 'true';
  isLocalNav = () => this.newMobileNav && this.elements.navWrapper?.querySelectorAll('.feds-nav > section.feds-navItem')?.length <= 1;
  // update GNAV popup position based on branch banner
  updatePopupPosition = activePopup => {
    const popup = activePopup || this.elements.mainNav.querySelector('.feds-navItem--section.feds-dropdown--active .feds-popup');
    if (!popup) return;
    const yOffset = window.scrollY || Math.abs(parseInt(document.body.style.top, 10)) || 0;
    const navOffset = this.block.classList.contains('has-promo') ? 'var(--feds-height-nav) - var(--global-height-navPromo)' : 'var(--feds-height-nav)';
    popup.removeAttribute('style');
    popup.style.top = `calc(${yOffset}px - ${navOffset} - 2px)`;
    const {
      isPresent,
      isSticky,
      height
    } = getBranchBannerInfo();
    if (isPresent) {
      const delta = yOffset - height;
      if (isSticky) {
        popup.style.height = `calc(100dvh - ${height}px + 2px)`;
      } else {
        popup.style.top = `calc(0px - var(--feds-height-nav) + ${Math.max(delta, 0)}px - 2px)`;
        popup.style.height = `calc(100dvh + ${Math.min(delta, 0)}px + 2px)`;
      }
    }
  };
  hasMegaMenu = () => this.elements.navWrapper?.querySelectorAll('.feds-nav > section.feds-navItem')?.length >= 1;
  searchPresent = () => !!this.content.querySelector('.search');
  loadDelayed = async () => {
    this.ready = this.ready || new Promise(async resolve => {
      try {
        this.block.removeEventListener('click', this.loadDelayed);
        this.block.removeEventListener('keydown', this.loadDelayed);
        if (this.searchPresent()) {
          const [{
            default: Search
          }] = await Promise.all([import('./features/search/gnav-search.js'), loadStyles(rootPath('features/search/gnav-search.css'))]);
          this.Search = Search;
        }
        if (!this.useUniversalNav) {
          const [{
            default: ProfileDropdown
          }] = await Promise.all([import('./features/profile/dropdown.js'), loadStyles(rootPath('features/profile/dropdown.css'))]);
          this.ProfileDropdown = ProfileDropdown;
        }
        resolve();
      } catch (e) {
        lanaLog({
          message: 'GNAV: Error within loadDelayed',
          e,
          tags: 'gnav',
          errorType: 'warn'
        });
        resolve();
      }
    });
    return this.ready;
  };
}

import {
  closeAllDropdowns,
  decorateCta,
  fetchAndProcessPlainHtml,
  getActiveLink,
  getAnalyticsValue,
  getExperienceName,
  isActiveLink,
  icons,
  isDesktop,
  isTangentToViewport,
  lanaLog,
  loadBaseStyles,
  loadDecorateMenu,
  rootPath,
  loadStyles,
  logErrorFor,
  selectors,
  setActiveDropdown,
  setCurtainState,
  setUserProfile,
  toFragment,
  trigger,
  yieldToMain,
  addMepHighlightAndTargetId,
  isDarkMode,
  darkIcons,
  setDisableAEDState,
  animateInSequence,
  transformTemplateToMobile,
  closeAllTabs,
  disableMobileScroll,
  enableMobileScroll,
  setAsyncDropdownCount,
  branchBannerLoadCheck,
  getBranchBannerInfo
} from './utilities/utilities.js';
const hydrationToken = "global-navigation/global-navigation.js";
const hydrationBlocks = {
  _500: (payload) => {
    payload = {
      ...payload,
      localNav,
      title,
      id: 500
    };
    localNav.querySelector('.feds-localnav-title').addEventListener('click', () => {
      localNav.classList.toggle('feds-localnav--active');
      const isActive = localNav.classList.contains('feds-localnav--active');
      localNav.querySelector('.feds-localnav-title').setAttribute('aria-expanded', isActive);
      localNav.querySelector('.feds-localnav-title').setAttribute('daa-ll', `${title}_localNav|${isActive ? 'close' : 'open'}`);
    });
  },
  _938: (payload) => {
    payload = {
      ...payload,
      toggle,
      id: 938
    };
    toggle.addEventListener('click', () => logErrorFor(async () => {
      this.toggleMenuMobile();
      if (this.blocks?.search?.instance) {
        this.blocks.search.instance.clearSearchForm();
      } else {
        await this.loadSearch();
      }
      if (this.isToggleExpanded()) setHamburgerPadding();
    }, 'Toggle click failed', 'gnav', 'error'));
  },
  _1250: (payload) => {
    payload = {
      ...payload,
      popup,
      isDesktop,
      id: 1250
    };
    isDesktop.addEventListener('change', async () => {
      enableMobileScroll();
      if (isDesktop.matches) {
        popup.innerHTML = originalContent;
        this.block.classList.remove('new-nav');
      } else {
        originalContent = await transformTemplateToMobile(popup, item, this.isLocalNav());
        popup.querySelector('.close-icon')?.addEventListener('click', this.toggleMenuMobile);
        this.block.classList.add('new-nav');
      }
    });
  },
  _1296: (payload) => {
    payload = {
      ...payload,
      dropdownTrigger,
      isSectionMenu,
      id: 1296
    };
    dropdownTrigger.addEventListener('click', e => {
      if (!isDesktop.matches && this.newMobileNav && isSectionMenu) {
        const popup = dropdownTrigger.nextElementSibling;
        if (popup && this.isLocalNav()) {
          this.updatePopupPosition(popup);
        }
        makeTabActive(popup);
      } else if (isDesktop.matches && this.newMobileNav && isSectionMenu) {
        const popup = dropdownTrigger.nextElementSibling;
        if (popup) popup.style.removeProperty('top');
      }
      trigger({
        element: dropdownTrigger,
        event: e,
        type: 'dropdown'
      });
      setActiveDropdown(dropdownTrigger);
    });
  }
};
/**
 * Dynamic Hydration Runtime Code
 * This module provides runtime functionality for hydrating components on the client side.
 */

/**
 * Performs client-side hydration dynamically at runtime using only 'id'.
 * Processes raw hydration data collected during SSR, finds corresponding
 * code block definition using 'id', resolves elements, and executes the code.
 * Replaces build-time generation of individual init_X functions.
 *
 * @param {Array<object>} rawHydratorData Raw hydration data array from SSR.
 * Example element: {id: 0, elements: {param1: "sh-id"}, data: {param3: "value"}}
 * @param {Array<object>} blockDefinitions Array defining hydration code blocks.
 * Example element: {id: 0, code: "console.log(param1);"}
 * 'id' must uniquely identify a code block in this version.
 */
export function hydrateDynamically(rawHydratorData, blockDefinitions = []) {
  // 1. Validate Inputs
  if (!Array.isArray(rawHydratorData)) {
    console.error("Dynamic Hydration (ID Only) failed: rawHydratorData must be an array.", rawHydratorData);
    return;
  }
  if (!Array.isArray(blockDefinitions)) {
    console.error("Dynamic Hydration (ID Only) failed: blockDefinitions must be an array.", blockDefinitions);
    return;
  }
  if (rawHydratorData.length === 0) {
    console.log("No raw hydration data found.");
    return;
  }
  if (blockDefinitions.length === 0) {
    console.log("No hydration block definitions found.");
    // return;
  }

  console.log(`Starting dynamic hydration (ID Only). Found ${rawHydratorData.length} raw tasks and ${blockDefinitions.length} block definitions.`);

  // Create a map from blockDefinitions using only ID for faster lookups
  const blockMap = new Map();
  blockDefinitions.forEach(def => {
    // Check if definition has required fields (id and code)
    if (def && def.id !== undefined && typeof def.code === 'string') {
      const blockId = def.id; // Use ID as the key
      if (blockMap.has(blockId)) {
        // Warn about duplicates but allow last one to win
        console.warn(`Duplicate block definition found for id: ${blockId}. Last definition will be used.`);
      }
      blockMap.set(blockId, def.code);
    } else {
      console.warn("Invalid block definition encountered during map creation (missing id or code):", def);
    }
  });

  //   if (blockMap.size === 0) {
  //     console.error("No valid block definitions were processed into the lookup map. Cannot proceed.");
  //     return;
  //   }

  // 2. Process each raw hydration task instance from SSR
  rawHydratorData.forEach((rawTask, taskIndex) => {
    // Validate raw task structure needed for processing (only need id)
    if (!rawTask || typeof rawTask !== 'object' || rawTask.id === undefined) {
      console.warn(`Skipping invalid raw hydration task at index ${taskIndex} (missing id):`, rawTask);
      return;
    }

    // Find the corresponding code string using only the ID
    const blockId = rawTask.id;
    const blockCodeString = blockMap.get(blockId);

    // Skip if no code found for this task's block definition ID
    // if (blockCodeString === undefined) {
    //   console.warn(`No code definition found for block id "${blockId}" (Task index ${taskIndex}). Skipping task.`);
    //   return;
    // }

    try {
      const resolvedArgs = {}; // Holds resolved elements and data for this instance

      // 3. Resolve DOM Elements for this task instance
      const rawElements = rawTask.elements || {};
      for (const key in rawElements) {
        const idOrIds = rawElements[key];
        let selector = null;
        let isMultiple = false;

        if (Array.isArray(idOrIds)) {
          if (idOrIds.length > 0) {
            selector = idOrIds
              .map(mId => typeof mId === 'string' ? `[data-hydrate-multi="${mId}"]` : null)
              .filter(s => s !== null)
              .join(',');
            isMultiple = true;
            if (!selector) {
              console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): No valid multi-IDs found in array:`, idOrIds);
              resolvedArgs[key] = document.querySelectorAll(`.non-existent-class-${Date.now()}`);
              continue;
            }
          } else {
            console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): Empty array provided for multi-element IDs.`);
            resolvedArgs[key] = document.querySelectorAll(`.non-existent-class-${Date.now()}`);
            continue;
          }
        } else if (typeof idOrIds === 'string' && idOrIds.startsWith('sh-')) {
          selector = `[data-hydrate-id="${idOrIds}"]`;
          isMultiple = false;
        } else {
          console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): Invalid element ID format found:`, idOrIds);
          resolvedArgs[key] = null;
          continue;
        }

        if (selector) {
          const elementsNodeList = document.querySelectorAll(selector);
          if (isMultiple) {
            resolvedArgs[key] = elementsNodeList;
            if (elementsNodeList.length === 0) {
              console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): No elements found for selector '${selector}'`);
            }
          } else {
            resolvedArgs[key] = elementsNodeList[0] || null;
            if (!resolvedArgs[key]) {
              console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): No element found for selector '${selector}'`);
            }
          }
        } else {
          resolvedArgs[key] = isMultiple ? document.querySelectorAll(`.non-existent-class-${Date.now()}`) : null;
        }
      }

      // 4. Merge Static Data for this task instance
      const rawData = rawTask.data || {};
      for (const key in rawData) {
        if (resolvedArgs.hasOwnProperty(key)) {
          console.warn(`Dynamic Hydration (ID: ${blockId}, Task: ${taskIndex}, Key: ${key}): Data key clashes with element key. Data value will be used.`);
        }
        resolvedArgs[key] = rawData[key];
      }

      // 5. Prepare for Code Execution
      const argNames = Object.keys(resolvedArgs);
      const argValues = argNames.map(name => resolvedArgs[name]);
      console.log(argNames);

      hydrationBlocks[`block_${rawTask.id}`](resolvedArgs);

      // 6. Execute the User's Hydration Code for this specific instance
      // const hydrateAction = new Function(...argNames, blockCodeString);
      // const hydrateAction = function (...argValues) { eval(blockCodeString) };
      // hydrateAction(...argValues);

    } catch (error) {
      console.error(`Error during dynamic hydration execution (ID: ${blockId}, Task Index: ${taskIndex}):`, error, "Task details:", rawTask);
    }
  });

  console.log("Dynamic hydration process finished (ID Only).");
}

/**
 * Initializes dynamic hydration when the DOM is ready
 */
export function initializeDynamicHydration() {
  // Assumes window.__HYDRATOR_DATA__ (raw SSR data array) and
  // window.__BLOCK_DEFINITIONS__ (block definitions array) are populated globally
  const token = hydrationToken;
  const rawData = (window.hydrateData || []).filter(data => data.file === token);
  const blockDefs = (window.code || [])[token];


  // Call the main hydration function
  hydrateDynamically(rawData, blockDefs);
}

// Run after DOM is ready
if (typeof document !== 'undefined') {
  initializeDynamicHydration();
}