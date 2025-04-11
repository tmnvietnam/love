const newParticlesPerFrame = 100;

const color = (hsl, o) => {
    return `hsla(${hsl.h | 0}, ${hsl.s}%, ${hsl.l}%, ${o})`;
};

class TextSparks {
    constructor() {
        this.opa = 0;
        this.tick = 0;
        this.drawCB = null;
        this.mask = null;
        this.canvas = window.document.querySelector('canvas');
        this.engine = this.canvas.getContext('2d');

        this.maskTick = 0;
        this.nextMaskCb = this.nextMask.bind(this);
        this.maskCache = [];

        this.resize();
        this.fetchData();
        this.buildStackCache();

        this.particleMap = new Map();
    }

    buildStackCache() {
        this.maskCache = this.stack.map((stack) => {
            return this.buildTextMask(stack.texts);
        });
    }

    fetchData() {
        this.stackId = -1;
        this.stack = [...document.querySelectorAll('div > ul')].map(ul => {
            return {
                ticks: 0.05 * (ul.hasAttribute('data-time') ? ul.getAttribute('data-time') : 0),
                fadeIn: ul.hasAttribute('data-fade-in') ? 50 / Number(ul.getAttribute('data-fade-in')) : 0,
                fadeOut: ul.hasAttribute('data-fade-out') ? 50 / Number(ul.getAttribute('data-fade-out')) : 0,
                texts: [...ul.querySelectorAll('li')].map(li => {
                    return {
                        text: li.innerHTML.trim(),
                        hsl: {
                            h: li.hasAttribute('data-hue') ? Number(li.getAttribute('data-hue')) : 340,
                            s: li.hasAttribute('data-saturation') ? Number(li.getAttribute('data-saturation')) : 90,
                            l: li.hasAttribute('data-lightness') ? Number(li.getAttribute('data-lightness')) : 60
                        }
                    };
                })
            };
        });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.canvas.setAttribute('width', this.width);
        this.canvas.setAttribute('height', this.height);
    }

    buildTextMask(texts) {
        const mask = [];
        const textAll = texts.reduce((all, textStack) => {
            return all.concat(textStack.text);
        }, '');

        const size = 0.8;
        const width = 200;
        const height = width / (this.width / this.height) | 0;
        const baseFontSize = 20;

        const canvas = document.createElement('canvas');
        const engine = canvas.getContext('2d');

        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);

        const font = (size) => {
            return `${size}px Arial`;
        };

        engine.fillStyle = '#000';
        engine.font = font(baseFontSize);
        const m = engine.measureText(textAll);
        const rel = m.width / (width * size);
        const fSize = Math.min(height * 0.8, baseFontSize / rel | 0);

        engine.font = font(fSize);
        const fontWidth = engine.measureText(textAll).width;

        engine.fillText(
            textAll,
            (width - fontWidth) / 2,
            height / 2 + fSize * 0.35
        );

        let left = (width - fontWidth) / 2;
        const bot = height / 2 + fSize * 0.35;

        Object.values(texts).forEach(textStack => {
            engine.clearRect(0, 0, width, height);

            engine.fillText(
                textStack.text,
                left,
                bot
            );

            left += engine.measureText(textStack.text).width;

            const data = engine.getImageData(0, 0, width, height);
            const subStack = [];

            for (let i = 0, max = data.width * data.height; i < max; i++) {
                if (data.data[i * 4 + 3]) {
                    subStack.push({
                        x: (i % data.width) / data.width,
                        y: (i / data.width | 0) / data.height,
                        o: Math.random(),
                        t: Math.random()
                    });
                }
            }

            mask.push({
                hsl: textStack.hsl,
                s: subStack
            });
        });

        return mask;
    }

    createNewParticle() {
        for (let i = 0; i < newParticlesPerFrame; i++) {
            let main = Math.random() * this.mask.length | 0;
            let subMask = this.mask[main];
            let maskElement = this.mask[main].s[Math.random() * this.mask[main].s.length | 0];

            if (subMask && maskElement) {
                let particle = {
                    x: maskElement.x,
                    y: maskElement.y,
                    hsl: subMask.hsl,
                    c: this.prepareParticle
                };

                this.particleMap.set(particle, particle);
            }
        }
    }

    secLog(log, timesPerFrame) {
        if (Math.random() < 1 / 60 / timesPerFrame) {
            console.log(log);
        }
    }

    clear() {
        this.engine.fillStyle = '#111';
        this.engine.fillRect(0, 0, this.width, this.height);
    }

    randFromList(...rands) {
        return rands.reduce((acc, rand) => {
            return acc + rand;
        }, 0) / rands.length;
    }

    prepareParticle(particle) {
        const r1 = Math.random();
        const r2 = Math.random();
        const r3 = Math.random();

        const rad = r3 * Math.PI * 2;

        // Trái tim xuất hiện từ ngoài và di chuyển vào giữa
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const distanceFromCenter = Math.random() * (this.width / 2);

        // Tạo các hạt ở ngoài vùng màn hình
        particle.x = Math.random() * this.width + this.width; // Bắt đầu ngoài màn hình
        particle.y = Math.random() * this.height + this.height; // Bắt đầu ngoài màn hình

        particle.s = 0.003 + this.randFromList(r1, r2) / 10;
        particle.l = 0;

        particle.mx = (centerX - particle.x) * 0.01; // Di chuyển về trung tâm
        particle.my = (centerY - particle.y) * 0.01; // Di chuyển về trung tâm

        particle.c = this.drawParticle;
    }

    drawParticle(particle) {
        if (particle.l >= 1) {
            particle.c = null;
            return;
        }

        // Di chuyển về trung tâm
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;

        // Áp dụng lực đẩy về phía trung tâm
        const attraction = 0.05;
        particle.mx += dx * attraction;
        particle.my += dy * attraction;

        particle.l += particle.s;
        particle.x += particle.mx;
        particle.y += particle.my;

        const size = particle.si;
        const x = particle.x * this.width;
        const y = particle.y * this.height;
        const ctx = this.engine;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size / 10, size / 10); // scale to adjust heart size
        ctx.beginPath();

        // Vẽ trái tim
        ctx.moveTo(0, -3);
        ctx.bezierCurveTo(-2, -5, -5, -1, 0, 3);
        ctx.bezierCurveTo(5, -1, 2, -5, 0, -3);

        ctx.closePath();

        ctx.fillStyle = color(particle.hsl, this.opa * Math.sin(particle.l * Math.PI));
        ctx.fill();
        ctx.restore();
    }

    renderParticles() {
        this.particleMap.forEach((particle) => {
            particle.c.call(this, particle);

            if (!particle.c) {
                this.particleMap.delete(particle);
            }
        });
    }

    drawStatic() {
        let i = 0;
        const step = 0.01;

        this.mask.forEach(subMask => {
            subMask.s.forEach(pos => {
                i++;

                const x = pos.x * this.width;
                const y = pos.y * this.height;

                // Hiệu ứng phập phồng bằng cos
                const pulse = (1 + Math.cos(this.tick * 0.05 + pos.t * 10)) / 2;
                const baseSize = this.width / 150;
                const size = baseSize * (0.7 + pulse * 0.6);

                const ctx = this.engine;
                const opacity = pulse * this.opa * pos.t * 0.5;

                ctx.fillStyle = color(subMask.hsl, opacity);

                ctx.save();
                ctx.translate(x, y);
                ctx.scale(size / 10, size / 10);
                ctx.beginPath();

                // Vẽ trái tim
                ctx.moveTo(0, -3);
                ctx.bezierCurveTo(-2, -5, -5, -1, 0, 3);
                ctx.bezierCurveTo(5, -1, 2, -5, 0, -3);

                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        });
    }

    draw() {
        this.tick++;

        this.nextMaskCb();
        this.createNewParticle();
        this.clear();

        this.engine.globalCompositeOperation = 'lighter';
        this.drawStatic();
        this.renderParticles();
        this.engine.globalCompositeOperation = 'source-over';

        requestAnimationFrame(this.drawCB);
    }

    fadeInMask() {
        this.opa += this.stack[this.stackId].fadeIn;

        if (this.opa >= 1) {
            this.opa = 1;
            this.afterFadeIn();
        }
    }

    afterFadeIn() {
        this.opa = 1;

        if (this.stack[this.stackId].ticks) {
            this.maskTick = 0;
            this.nextMaskCb = this.tickMask.bind(this);
        } else {
            this.nextMaskCb = () => {};
        }
    }

    fadeOutMask() {
        this.opa -= this.stack[this.stackId].fadeOut;

        if (this.opa <= 0) {
            this.afterFadeOut();
        }
    }

    afterFadeOut() {
        this.opa = 0;
        this.nextMaskCb = this.nextMask.bind(this);
    }

    tickMask() {
        this.maskTick++;

        if (this.maskTick >= this.stack[this.stackId].ticks) {
            if (this.stack[this.stackId].fadeOut) {
                this.nextMaskCb = this.fadeOutMask.bind(this);
            } else {
                this.afterFadeOut();
            }
        }
    }

    nextMask() {
        this.stackId++;

        if (this.stackId >= this.stack.length) {
            this.stackId = 0;
        }

        this.mask = this.maskCache[this.stackId];

        if (this.stack[this.stackId].fadeIn) {
            this.nextMaskCb = this.fadeInMask.bind(this);
        } else {
            this.opa = 1;
            this.afterFadeIn();
        }
    }

    run() {
        this.drawCB = this.draw.bind(this);
        this.drawCB();
    }
}

const a = new TextSparks();
a.run();
