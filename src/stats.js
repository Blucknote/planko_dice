import { getColorForNumber, getColorForDeviation } from './utils.js';

export class Statistics {
    constructor() {
        this.rolls = {};
        this.totalRolls = 0;
        this.lastRoll = null;

        for (let i = 1; i <= 20; i++) {
            this.rolls[i] = 0;
        }

        this.distributionElement = this.getElement('distribution');
        this.chartCanvas = this.getElement('chart');
        this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;
        this.currentNumberElement = this.getElement('number-value');

        this.statRows = new Map();

        if (this.distributionElement) {
            this.createStatRows();
            this.updateDisplay();
        }
    }

    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element with id "${id}" not found`);
        }
        return element;
    }

    addRoll(number) {
        if (number >= 1 && number <= 20) {
            this.rolls[number]++;
            this.totalRolls++;
            this.lastRoll = number;
            this.updateDisplay();
            this.updateCurrentNumber(number);
        }
    }

    updateCurrentNumber(number) {
        if (!this.currentNumberElement) return;

        this.currentNumberElement.textContent = number;

        this.currentNumberElement.style.transform = 'scale(1.2)';
        this.currentNumberElement.style.color = getColorForNumber(number);

        setTimeout(() => {
            this.currentNumberElement.style.transform = 'scale(1)';
        }, 200);
    }

    createStatRows() {
        for (let i = 1; i <= 20; i++) {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span class="stat-number">${i}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar" style="width: 0%">
                        <span class="stat-count">0</span>
                    </div>
                </div>
                <span class="stat-percentage">0%</span>
            `;
            this.distributionElement.appendChild(row);
            this.statRows.set(i, {
                row,
                bar: row.querySelector('.stat-bar'),
                count: row.querySelector('.stat-count'),
                percentage: row.querySelector('.stat-percentage')
            });
        }
    }

    reset() {
        for (let i = 1; i <= 20; i++) {
            this.rolls[i] = 0;
        }
        this.totalRolls = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        const rollValues = Object.values(this.rolls);
        const maxCount = rollValues.length > 0 ? Math.max(...rollValues) : 1;

        for (let i = 1; i <= 20; i++) {
            const count = this.rolls[i];
            const percentage = this.totalRolls > 0
                ? ((count / this.totalRolls) * 100).toFixed(1)
                : '0';
            const barWidth = maxCount > 0
                ? (count / maxCount) * 100
                : 0;

            const row = this.statRows.get(i);
            if (row) {
                row.bar.style.width = `${barWidth}%`;
                row.count.textContent = count;
                row.percentage.textContent = `${percentage}%`;
            }
        }

        this.updateChart();
    }

    updateChart() {
        const canvas = this.chartCanvas;
        const ctx = this.chartCtx;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (this.totalRolls === 0) return;

        // Calculate dimensions
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = chartWidth / 20;
        const maxCount = Math.max(...Object.values(this.rolls), 1);

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw expected frequency line (5% for d20)
        const expectedY = height - padding - (chartHeight * (this.totalRolls * 0.05) / maxCount);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, expectedY);
        ctx.lineTo(width - padding, expectedY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw bars
        for (let i = 1; i <= 20; i++) {
            const count = this.rolls[i];
            const barHeight = (count / maxCount) * chartHeight;
            const x = padding + (i - 1) * barWidth;
            const y = height - padding - barHeight;

            const expected = this.totalRolls / 20;
            const deviation = expected > 0 ? Math.abs(count - expected) / expected : 0;

            ctx.fillStyle = getColorForDeviation(deviation);
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

            if (i % 2 === 1) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(i.toString(), x + barWidth / 2, height - padding + 15);
            }
        }

        // Draw max count label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(maxCount.toString(), padding - 5, padding + 5);
        ctx.fillText('0', padding - 5, height - padding + 5);
    }

    getStatistics() {
        const expected = this.totalRolls / 20;
        const variance = Object.values(this.rolls).reduce((sum, count) => {
            return sum + Math.pow(count - expected, 2);
        }, 0) / 20;
        const stdDev = Math.sqrt(variance);

        return {
            totalRolls: this.totalRolls,
            rolls: { ...this.rolls },
            expected,
            variance,
            stdDev
        };
    }
}
