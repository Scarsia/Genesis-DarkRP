/**
 * Genesis Phone - Calculator App
 * Clean rewrite matching SBF Phone calculator layout
 */

window.phoneAppManager && window.phoneAppManager.register('calculator', {
    display: '0',
    previousValue: null,
    operator: null,
    waitingForSecond: false,

    getHTML() {
        const t = (key, fb) => window.localeLoader ? window.localeLoader.getText(key, fb) : fb;
        return `
        <div class="calculator-app" style="display:flex;flex-direction:column;height:100%;background:#000;border-radius:35px 35px 0 0;">
            <!-- Display -->
            <div class="calc-display" style="flex:1;display:flex;align-items:flex-end;justify-content:flex-end;padding:20px 24px 10px;min-height:120px;">
                <span id="calc-result" style="font-size:48px;font-weight:300;color:#fff;word-break:break-all;text-align:right;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">0</span>
            </div>
            <!-- Buttons -->
            <div class="calc-buttons" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px 16px 30px;">
                <button class="calc-btn func" data-action="clear">C</button>
                <button class="calc-btn func" data-action="sign">+/-</button>
                <button class="calc-btn func" data-action="percent">%</button>
                <button class="calc-btn op" data-action="operator" data-op="/">÷</button>

                <button class="calc-btn num" data-action="digit" data-val="7">7</button>
                <button class="calc-btn num" data-action="digit" data-val="8">8</button>
                <button class="calc-btn num" data-action="digit" data-val="9">9</button>
                <button class="calc-btn op" data-action="operator" data-op="*">×</button>

                <button class="calc-btn num" data-action="digit" data-val="4">4</button>
                <button class="calc-btn num" data-action="digit" data-val="5">5</button>
                <button class="calc-btn num" data-action="digit" data-val="6">6</button>
                <button class="calc-btn op" data-action="operator" data-op="-">−</button>

                <button class="calc-btn num" data-action="digit" data-val="1">1</button>
                <button class="calc-btn num" data-action="digit" data-val="2">2</button>
                <button class="calc-btn num" data-action="digit" data-val="3">3</button>
                <button class="calc-btn op" data-action="operator" data-op="+">+</button>

                <button class="calc-btn num zero" data-action="digit" data-val="0" style="grid-column:span 2;">0</button>
                <button class="calc-btn num" data-action="decimal">.</button>
                <button class="calc-btn op equals" data-action="equals">=</button>
            </div>
        </div>
        <style>
            .calc-btn {
                height: 56px; border: none; border-radius: 28px; font-size: 22px;
                font-weight: 500; cursor: pointer; transition: opacity 0.1s;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .calc-btn:active { opacity: 0.6; }
            .calc-btn.num { background: #333; color: #fff; }
            .calc-btn.func { background: #a5a5a5; color: #000; }
            .calc-btn.op { background: #FF9500; color: #fff; }
            .calc-btn.op.active { background: #fff; color: #FF9500; }
            .calc-btn.zero { text-align: left; padding-left: 24px; }
        </style>
        `;
    },

    onOpen(wrapper) {
        this.display = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForSecond = false;

        wrapper.querySelectorAll('.calc-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'digit') this._digit(btn.dataset.val);
                else if (action === 'decimal') this._decimal();
                else if (action === 'operator') this._operator(btn.dataset.op);
                else if (action === 'equals') this._equals();
                else if (action === 'clear') this._clear();
                else if (action === 'sign') this._sign();
                else if (action === 'percent') this._percent();
                this._updateDisplay(wrapper);
            });
        });
    },

    _digit(val) {
        if (this.waitingForSecond) {
            this.display = val;
            this.waitingForSecond = false;
        } else {
            this.display = this.display === '0' ? val : this.display + val;
        }
    },

    _decimal() {
        if (this.waitingForSecond) { this.display = '0.'; this.waitingForSecond = false; return; }
        if (!this.display.includes('.')) this.display += '.';
    },

    _operator(op) {
        const current = parseFloat(this.display);
        if (this.previousValue !== null && !this.waitingForSecond) {
            this.display = String(this._calculate(this.previousValue, current, this.operator));
        }
        this.previousValue = parseFloat(this.display);
        this.operator = op;
        this.waitingForSecond = true;
    },

    _equals() {
        if (this.previousValue === null || this.operator === null) return;
        const current = parseFloat(this.display);
        const result = this._calculate(this.previousValue, current, this.operator);
        this.display = String(result);
        this.previousValue = null;
        this.operator = null;
        this.waitingForSecond = false;
    },

    _calculate(a, b, op) {
        switch(op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return b !== 0 ? a / b : 'Error';
            default: return b;
        }
    },

    _clear() {
        this.display = '0';
        this.previousValue = null;
        this.operator = null;
        this.waitingForSecond = false;
    },

    _sign() {
        const val = parseFloat(this.display);
        this.display = String(val * -1);
    },

    _percent() {
        this.display = String(parseFloat(this.display) / 100);
    },

    _updateDisplay(wrapper) {
        const el = wrapper.querySelector('#calc-result');
        if (el) {
            let text = this.display;
            // Format long numbers
            if (text !== 'Error' && !isNaN(parseFloat(text))) {
                const num = parseFloat(text);
                if (text.includes('.') && !this.waitingForSecond) {
                    // Keep decimal as typed
                } else if (Math.abs(num) >= 1e12) {
                    text = num.toExponential(4);
                }
            }
            el.textContent = text;
            // Auto-shrink font for long displays
            el.style.fontSize = text.length > 10 ? '32px' : text.length > 7 ? '40px' : '48px';
        }
    },

    onClose() {}
});
