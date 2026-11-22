/* =========================================================
   富士見湯「妖怪湯けむり譚」
   ========================================================= */
(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const header = document.getElementById('header');

    /* ---------------------------------------------------------
       1. オープニング：湯けむりが晴れて、タイトルがディゾルブで現れる
       --------------------------------------------------------- */
    const heroImg = document.querySelector('.hero__bg img');
    const heroTitle = document.querySelector('.hero__title');
    const steamMap = document.getElementById('steam-map');
    const steamNoise = document.getElementById('steam-noise');

    // タイトル画像を「湯けむりの揺らぎ」でほどけた状態から、くっきりした状態へ
    const dissolveTitle = () => {
        if (reduceMotion || !steamMap || !heroTitle) return;
        const duration = 2600;
        const from = 90;
        let start = null;
        heroTitle.classList.add('is-dissolving');

        const tick = (now) => {
            if (start === null) start = now;
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            steamMap.setAttribute('scale', (from * (1 - ease)).toFixed(2));
            steamNoise.setAttribute('baseFrequency', `${(0.012 + 0.01 * (1 - ease)).toFixed(4)} ${(0.02 + 0.015 * (1 - ease)).toFixed(4)}`);
            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                // 終わったらフィルターを外して軽くする
                heroTitle.classList.remove('is-dissolving');
            }
        };
        requestAnimationFrame(tick);
    };

    let started = false;
    const startOpening = () => {
        if (started) return;
        started = true;
        requestAnimationFrame(() => {
            root.classList.add('is-loaded');
            setTimeout(dissolveTitle, 300);
        });
    };

    if (heroImg && !heroImg.complete) {
        heroImg.addEventListener('load', startOpening, { once: true });
        heroImg.addEventListener('error', startOpening, { once: true });
        setTimeout(startOpening, 2500); // 通信が遅くても待たせすぎない
    } else {
        startOpening();
    }

    /* ---------------------------------------------------------
       2. 見出しを1文字ずつに分けて、ディゾルブで表示
       --------------------------------------------------------- */
    const splitChars = (el) => {
        const label = el.textContent.trim();
        let i = 0;
        const walk = (node) => {
            [...node.childNodes].forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    [...child.textContent].forEach((ch) => {
                        if (ch.trim() === '') {
                            frag.append(ch);
                            return;
                        }
                        const span = document.createElement('span');
                        span.className = 'char';
                        span.style.setProperty('--i', i++);
                        span.setAttribute('aria-hidden', 'true');
                        span.textContent = ch;
                        frag.append(span);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        };
        walk(el);
        el.setAttribute('aria-label', label); // 読み上げは1文として
    };

    document.querySelectorAll('[data-dissolve]').forEach(splitChars);

    /* ---------------------------------------------------------
       3. スクロールで表示（見出し・カードなど）
       --------------------------------------------------------- */
    // 同じ親の中の要素は少しずつ遅らせて出す
    const groups = new Map();
    document.querySelectorAll('[data-reveal]').forEach((el) => {
        const parent = el.parentElement;
        const n = groups.get(parent) || 0;
        el.style.setProperty('--d', n);
        groups.set(parent, n + 1);
    });

    const targets = document.querySelectorAll('[data-reveal], [data-dissolve], .sec-head');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
        targets.forEach((el) => io.observe(el));
    } else {
        targets.forEach((el) => el.classList.add('is-in'));
    }

    // 絵巻物のように広がる写真：切り抜かれている間は「見えていない」扱いになるため、親要素で判定する
    const unrolls = document.querySelectorAll('[data-unroll]');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const unrollIo = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.querySelectorAll(':scope > [data-unroll]').forEach((el) => el.classList.add('is-in'));
                unrollIo.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
        new Set([...unrolls].map((el) => el.parentElement)).forEach((parent) => unrollIo.observe(parent));
    } else {
        unrolls.forEach((el) => el.classList.add('is-in'));
    }

    /* ---------------------------------------------------------
       4. ヘッダー：下にスクロールで隠れ、上に戻すと出てくる
       5. 上へ戻るボタン
       6. 飾りのゆるいパララックス
       --------------------------------------------------------- */
    const toTop = document.getElementById('to-top');
    const parallaxEls = reduceMotion ? [] : [...document.querySelectorAll('[data-parallax], [data-drift]')];
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
        const y = window.scrollY;
        const goingDown = y > lastY;

        if (!document.body.classList.contains('is-menu-open')) {
            header.classList.toggle('is-hidden', goingDown && y > 400);
        }
        header.classList.toggle('is-scrolled', y > 10);
        toTop.classList.toggle('is-shown', y > window.innerHeight * 0.8);

        parallaxEls.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
            const speed = parseFloat(el.dataset.parallax) || 0;
            const drift = parseFloat(el.dataset.drift) || 0; // 横に流れる（絵巻物を送るように）
            const center = rect.top + rect.height / 2 - window.innerHeight / 2;
            el.style.translate = `${(center * drift).toFixed(1)}px ${(center * speed).toFixed(1)}px`;
        });

        lastY = y;
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
    onScroll();

    /* ---------------------------------------------------------
       7. 今いる章をナビで示す
       --------------------------------------------------------- */
    const navLinks = [...document.querySelectorAll('.nav-list a')];
    const navTargets = navLinks
        .map((a) => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    const setCurrent = (id) => {
        navLinks.forEach((a) => {
            const on = a.getAttribute('href') === id;
            a.classList.toggle('is-current', on);
            if (on) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
        });
    };

    if ('IntersectionObserver' in window && navTargets.length) {
        const navIo = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                setCurrent(`#${entry.target.id}`);
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        navTargets.forEach((el) => navIo.observe(el));

        // フッターは背が低く画面中央まで上がってこないので、最下部に着いたら「昨年度」を現在地にする
        const footerLink = navLinks.find((a) => a.getAttribute('href') === '#footer');
        if (footerLink) {
            let atBottom = false;
            const checkBottom = () => {
                const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
                if (bottom && !atBottom) setCurrent('#footer');
                atBottom = bottom;
            };
            window.addEventListener('scroll', checkBottom, { passive: true });
            checkBottom();
        }
    }

    /* 「昨年度」へ飛んだら、昨年度サイトへのリンクを光らせて場所を知らせる */
    const lastYearLink = document.querySelector('.footer__links a[href*="yuzunoko"]');
    if (lastYearLink) {
        document.querySelectorAll('a[href="#footer"]').forEach((a) => {
            a.addEventListener('click', () => {
                lastYearLink.classList.remove('is-spotlight');
                setTimeout(() => {
                    void lastYearLink.offsetWidth;
                    lastYearLink.classList.add('is-spotlight');
                }, reduceMotion ? 0 : 700);
            });
        });
        lastYearLink.addEventListener('animationend', () => lastYearLink.classList.remove('is-spotlight'));
    }

    /* ---------------------------------------------------------
       8. スマホメニュー
       --------------------------------------------------------- */
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const menuLabel = menuBtn.querySelector('.menu-btn__label');

    const openMenu = () => {
        menu.hidden = false;
        requestAnimationFrame(() => menu.classList.add('is-open'));
        menuBtn.setAttribute('aria-expanded', 'true');
        menuLabel.textContent = 'CLOSE';
        document.body.classList.add('is-menu-open');
        header.classList.remove('is-hidden');
        menu.querySelector('a').focus({ preventScroll: true });
    };

    const closeMenu = (returnFocus = true) => {
        menu.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuLabel.textContent = 'MENU';
        document.body.classList.remove('is-menu-open');
        const hide = () => { if (!menu.classList.contains('is-open')) menu.hidden = true; };
        if (reduceMotion) hide();
        else menu.addEventListener('transitionend', hide, { once: true });
        if (returnFocus) menuBtn.focus();
    };

    menuBtn.addEventListener('click', () => {
        menuBtn.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeMenu(false)));

    document.addEventListener('keydown', (e) => {
        if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
        if (e.key === 'Escape') {
            closeMenu();
            return;
        }
        // メニューを開いている間はフォーカスを中に閉じ込める
        if (e.key === 'Tab') {
            const items = [menuBtn, ...menu.querySelectorAll('a')];
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // PC幅に戻ったら閉じる
    window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
        if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });

    /* ---------------------------------------------------------
       9. 開催日のカードに「本日」を付ける
       --------------------------------------------------------- */
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    document.querySelectorAll('.day[data-date]').forEach((day) => {
        if (day.dataset.date === today && !day.classList.contains('day--off')) {
            day.classList.add('is-today');
        }
    });
})();
