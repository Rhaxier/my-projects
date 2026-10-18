// ==UserScript==
// @name         XKCD → ExplainXKCD Button
// @namespace    https://tampermonkey.net/
// @version      1.3
// @description  Adds a button to open the corresponding explainxkcd page (works for today's comic)
// @match        https://xkcd.com/*
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    const comicDiv = await waitForComic();
    const comicNumber = await getComicNumber();
    if (!comicNumber) return;

    const btn = document.createElement('button');
    btn.textContent = 'Explain XKCD';
    btn.style.marginTop = '10px';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
        window.open(
            `https://explainxkcd.com/wiki/index.php/${comicNumber}`,
            '_blank'
        );
    };

    comicDiv.after(btn);

    // ---- helpers ----

    function waitForComic() {
        return new Promise(resolve => {
            const check = () => {
                const div = document.getElementById('comic');
                if (div) resolve(div);
                else requestAnimationFrame(check);
            };
            check();
        });
    }

    async function getComicNumber() {
        // Numbered comics
        const m = location.pathname.match(/^\/(\d+)\/?$/);
        if (m) return m[1];

        // Today's comic → fetch official JSON
        try {
            const res = await fetch('/info.0.json');
            const data = await res.json();
            return data.num;
        } catch {
            return null;
        }
    }
})();
