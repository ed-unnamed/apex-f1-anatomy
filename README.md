# APEX F1 Anatomy

Interactive 2026-inspired Formula car explorer with an APXGP-inspired livery, rotatable 3D model, clickable component explanations, video links, dark/light themes and illustrative airflow.

## Publish using the GitHub website

1. Extract the ZIP on your computer.
2. Create a new public repository at https://github.com/new named apex-f1-anatomy. Public repositories support GitHub Pages on GitHub Free. This makes the code and published website public.
3. On the repository page, choose Upload an existing file (or Add file > Upload files).
4. Upload the CONTENTS of this folder, including the vendor folder. Do not upload the ZIP or the enclosing apex-f1-github folder. index.html must be visible at the top level of the repository.
5. Commit the files to main. If .nojekyll is hidden by your file picker, create an empty file named .nojekyll using Add file > Create new file.
6. Go to Settings > Pages. Under Build and deployment, choose Deploy from a branch.
7. Select main and /(root), then Save.
8. Wait for deployment to finish. Settings > Pages will show your website URL, normally https://YOUR-USERNAME.github.io/apex-f1-anatomy/.

To update the website, edit or replace the relevant files on main and commit. GitHub Pages publishes the changes automatically.

If the page does not load, check Actions for the Pages deployment result. If a model is missing, ensure vendor and its contents were uploaded with their original filenames and that the browser supports WebGL.

## Run on your computer

Use a local HTTP server rather than double-clicking index.html:
    python3 -m http.server 8000

On Windows with the Python launcher:
    py -m http.server 8000

Then open http://localhost:8000 in a browser with WebGL support. No npm dependencies or API keys are needed.

## Source files

- index.html: page layout and import map
- style.css: interface styling
- app.js: camera, controls, lighting, interactions and smoke
- model.js: procedural model, materials and livery
- content.js: component explanations
- videos.js: external video resources
- vendor/: bundled Three.js modules and third-party license

## Accuracy and attribution

This is an educational concept model, not official team CAD or a verified 2026 race car. Smoke paths are an illustrative animation, not CFD or measured wind-tunnel results. APXGP and sponsor references are fan-project styling; no endorsement is implied. Videos remain hosted by their original publishers.

Bundled Three.js code is covered by the license in vendor/THREE-LICENSE.txt. Keep that file with redistributions. No license grant for third-party brands is implied.

## Hosting

This export is independent of the ChatGPT-hosted version. Changes made here do not automatically update the original site, and future changes to the original site do not automatically sync here.
