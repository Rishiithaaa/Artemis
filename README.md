# Milo
Milo is a shared set of features and services to power Franklin-based websites on adobe.com. 

# Artemis – Improving Performance for Milo-Based Web Pages

## Problem

Web pages powered by the Milo framework were facing performance bottlenecks due to their heavy reliance on Client-Side Rendering (CSR). This approach caused:

- Slower initial load times (LCP > 4s)
- Poor Core Web Vitals (FCP, TTI, CLS)
- Delayed interactivity
- Inconsistent SEO indexing


## Description

Milo’s default rendering strategy loads minimal HTML and dynamically hydrates content through JavaScript per block. While flexible, this results in degraded user experience on slower networks or devices. The need was to optimize rendering, reduce JavaScript overhead, and improve overall page performance while preserving compatibility with Milo’s block-based architecture.

All performance enhancements, logic, and implementations are organized under the `hydra/` directory in each branch.

## Solution & Objectives

This repository introduces an approach to **pre-render and partially hydrate** Milo blocks using server-side rendering and modular hydration:

### Goals:
- Improve page load performance by generating static HTML via SSR
- Hydrate only interactive blocks and skip static ones
- Maintain Milo compatibility without rewriting blocks
- Ensure consistent SEO visibility and predictable rendering behavior

## Technologies Used

- **Node.js** – for build scripts and server logic
- **Puppeteer** – to simulate headless rendering for static HTML generation
- **Babel Parser** – to detect and transform hydration logic
- **JavaScript (ES6+)** – used for both core and hydration logic
- **HTML/CSS** – for structure and styling of blocks
- **Milo Framework** – Adobe’s modular, content-first web framework
- **Git & GitHub** – for version control and branch-based modular development

---

## Branches Overview

> Each branch represents performance work scoped to a specific page.  
> All work is under the `hydra/` folder in each branch.

- **`sticky`** –  **Photoshop** page.
- **`Lightroom`** –  **Photoshop-Lightroom** page.
- **`artemisIllus`** – **Illustrator** page.
