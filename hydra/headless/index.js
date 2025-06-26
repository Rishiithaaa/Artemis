import fs from "fs";
import puppeteer from "puppeteer";
import { performance } from "perf_hooks";
import { minify } from 'html-minifier';
const scriptContent = fs.readFileSync('./headless/inline.js', 'utf-8');

const run = async () => {
  const startTime = performance.now();
  const browser = await puppeteer.launch({ headless: "new", args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,9000'
  ] , defaultViewport: {
    width: 1920,
    height: 9000
  } });
  const page = await browser.newPage();

  // Store CSS content mapped to URLs
  const cssMap = new Map();
  const cssPromises = [];

  // Block images, fonts, and tracking scripts to speed up loading
  await page.setRequestInterception(true);

  page.on("request", async (req) => {
    const resourceType = req.resourceType();
    const url = req.url();

    if (["image", "font", "media"].includes(resourceType)) {
        req.abort();
    } else if (resourceType === "stylesheet") {
        try {
            if(url.includes("caas.css")) {
              req.abort();
              return;
            }
            // console.log(`Processing CSS URL: ${url}`);
            // console.log(`Processing CSS URL: ${url}`);
            const promise = fetch(url)
                .then(response => {
                    if (response.ok) {
                        return response.text().then(css => {
                            // Minify CSS before storing
                            const minifiedCSS = css.replace(/\s+/g, ' ').trim();
                            cssMap.set(url, minifiedCSS);
                        });
                    }
                })
                .catch(error => {
                    console.error(`Failed to fetch CSS: ${url}`, error);
                });
              cssPromises.push(promise);
        } catch (error) {
            console.error(`Failed to fetch CSS: ${url}`, error);
        }
        req.continue();
    } else if (resourceType === "script" && url.includes("caas.js")) {
        console.log(`Blocking script: ${url}`);
        req.abort();
    } else {
        req.continue();
    }
  });
const url = "https://main--cc--adobecom.aem.live/products/photoshop?milolibs=local&georouting=off";
//const url = "https://main--cc--adobecom.aem.live/products/illustrator?milolibs=local&georouting=off";
  await page.goto(url, {
    waitUntil: "networkidle0",
  });

  // Wait for all CSS promises to resolve
  await Promise.all(cssPromises);
await page.waitForSelector(".feds-footer-wrapper");
  // Wait for a key element to be sure the page is ready
  await page.waitForSelector("#page-load-ok-milo");
//   Extract HTML
//   Inject inline styles
  // await page.evaluate((cssMap) => {
  //   const head = document.querySelector("head");
  //   for (const [url, cssContent] of Object.entries(cssMap)) {
  //     const styleTag = document.createElement("style");
  //     styleTag.textContent = cssContent;
  //     head.appendChild(styleTag); 

  //   }
  //   const meta = document.createElement("meta");
  //   meta.setAttribute('name', 'robots');
  //   meta.setAttribute('content', 'noindex,nofollow');
  //   head.appendChild(meta);
  // }, Object.fromEntries(cssMap));
  // const cssEntries = Object.entries(cssMap);
  // const midPoint = Math.ceil(cssEntries.length / 2);
  // const firstHalf = cssEntries.slice(0, midPoint);
  // const secondHalf = cssEntries.slice(midPoint);
const hydrationTasks = await page.evaluate(() => window.__hydrate__);
  let html = await page.evaluate(function(scriptContent, cssEntries,hydrationTasks) { 

 // ---- Inject your image path converter logic ----
  function convertRelativeImagePaths() {
    const images = document.querySelectorAll('picture img, picture source');
    images.forEach(img => {
      const src = img.getAttribute('src');
      const srcset = img.getAttribute('srcset');
      if (src && src.startsWith('./')) {
        img.setAttribute('src', src.replace('./', '/products/'));
      }
      if (srcset && srcset.startsWith('./')) {
        img.setAttribute('srcset', srcset.replace('./', '/products/'));
      }
    });
  }
  convertRelativeImagePaths(); // run before returning HTML
    // 💡 Clear data-mouseevent to re-trigger event binding on client
document.querySelectorAll('video[data-mouseevent="true"]').forEach(video => {
  video.removeAttribute('data-mouseevent');
});

// 🔹 Placeholder for lazy <img>
const svgPlaceholder = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUzNiIgaGVpZ2h0PSI1MTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgc3R5bGU9ImZpbGw6I2NjY2NjYzsiLz48L3N2Zz4=";
const LCP_IMAGE_URL = "media_1360e829a01a4308c13168983349f11072384e156.jpg";

// 🔹 Modify <picture> tags
document.querySelectorAll('picture').forEach(picture => {
  const img = picture.querySelector('img');
  if (!img) return;

  const src = img.getAttribute('src') || "";

  if (src.includes(LCP_IMAGE_URL)) {
    img.classList.add("lcp-candidate");
    img.setAttribute("loading", "eager");
    img.setAttribute("fetchpriority", "high");
    return;
  }

  picture.classList.add("lazy-picture");

  picture.querySelectorAll('source').forEach(source => {
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      source.setAttribute('data-srcset', srcset);
      source.removeAttribute('srcset');
    }
  });

  if (src) {
    img.setAttribute('data-src', src);
    img.setAttribute('src', svgPlaceholder);
  }
});

// 🔹 Modify standalone <img> tags
document.querySelectorAll('img:not(.lcp-candidate):not([data-src])').forEach(img => {
  if (img.closest('picture')) return;
  const src = img.getAttribute('src');
  if (!src) return;

  img.classList.add('lazy-image');
  img.setAttribute('data-src', src);
  img.setAttribute('src', svgPlaceholder);
});

// 🔹 Prepare <video> elements
document.querySelectorAll('video').forEach(video => {
  const poster = video.getAttribute('poster');
  if (poster) {
    video.setAttribute('data-poster', poster);
    video.removeAttribute('poster');
  }

  const source = video.querySelector('source');
  if (source) {
    video.removeChild(source);
  }

  video.setAttribute('preload', 'none');
  video.classList.add('lazy-video');
});

const FINAL_IMAGE_URL = "https://www.adobe.com/products/media_1360e829a01a4308c13168983349f11072384e156.jpg?width=768&format=webply&optimize=medium";

// Replace full <picture> with a simplified one if it matches the LCP image
document.querySelectorAll('picture').forEach(picture => {
  const img = picture.querySelector('img');
  if (!img) return;

  const src = img.getAttribute('src') || "";
  if (!src.includes("media_1360e829a01a4308c13168983349f11072384e156.jpg")) return;

  // Create a new simplified <picture>
  const simplifiedPicture = document.createElement("picture");

  const newImg = document.createElement("img");
  newImg.setAttribute("src", FINAL_IMAGE_URL);
  newImg.setAttribute("width", "768");
  newImg.setAttribute("height", "460");
  newImg.setAttribute("alt", "Hero image");
  newImg.setAttribute("fetchpriority", "high");
  newImg.setAttribute("loading", "eager");
  newImg.classList.add("lcp-candidate");

  simplifiedPicture.appendChild(newImg);
  picture.replaceWith(simplifiedPicture);
});


    // const cssEntries = cssObject;
    const midPoint = Math.ceil(cssEntries.length / 2);
    const firstHalf = cssEntries.slice(0, midPoint);
  const secondHalf = cssEntries.slice(midPoint);
    return document.documentElement.outerHTML
    .replace('</head>', `<style>${firstHalf.map(([_, css]) => css).join('\n')}</style>
    <meta name="universal-nav" content="on"></head>`)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<link\b[^>]*rel=["']preload["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["'][^"']*preload[^"']*["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv=["']content-security-policy["'][^>]*>/gi, '')
    .replace(/<style>\s*body\s*{\s*display\s*:\s*none\s*;\s*}\s*<\/style>/gi, '')
    .replace(/<style>[^<]*body\s*{\s*display\s*:\s*none[^<]*<\/style>/gi, '')
    .replace('<head>', 
  `<head>
    <link rel="preload" as="image" href="https://www.adobe.com/products/media_1360e829a01a4308c13168983349f11072384e156.jpg?width=768&format=webply&optimize=medium" fetchpriority="high">`)
    .replace('</body>', 
        `<style>.consonant-Wrapper {height: unset !important;} ${secondHalf.map(([_, css]) => css).join('\n')}</style>
        <script type="module">
        ${scriptContent}
        </script><script src="https://stage.adobeccstatic.com/unav/1.3/UniversalNav.js" type="text/javascript"></script>\n
                <script type='module'>window.hydrateData=${JSON.stringify(hydrationTasks)} </script></body>`)
}, scriptContent, [...cssMap.entries()], hydrationTasks);

  // Log the number of hydration tasks found


console.log(`Found ${Object.keys(hydrationTasks).length} hydration tasks.`);
//console.log(`Hydration tasks: ${JSON.stringify(hydrationTasks, null, 2)}`);
const minifiedHtml = minify(html, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
  useShortDoctype: true
});
 
  await browser.close();
  await fs.writeFileSync("output.html", minifiedHtml);
  await fs.writeFileSync("output.json", JSON.stringify(hydrationTasks,null,2));
  const endTime = performance.now();
  console.log(`⏳ Execution time: ${(endTime - startTime).toFixed(2)} ms`);
};


run().catch(console.error);
