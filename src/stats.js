export class Statistics {
    constructor() {
        this.rolls = {};
        this.totalRolls = 0;

        // Initialize all d20 numbers
        for (let i = 1; i <= 20; i++) {
            this.rolls[i] = 0;
        }

        this.totalRollsElement = document.getElementById('total-rolls');
        this.distributionElement = document.getElementById('distribution');
        this.chartCanvas = document.getElementById('chart');
        this.chartCtx = this.chartCanvas.getContext('2d');

        this.updateDisplay();
    }

    addRoll(number) {
        if (number >= 1 && number <= 20) {
            this.rolls[number]++;
            this.totalRolls++;
            this.updateDisplay();
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
        // Update total
        this.totalRollsElement.textContent = `Total Rolls: ${this.totalRolls}`;

        // Update distribution bars
        this.distributionElement.innerHTML = '';

        const maxCount = Math.max(...Object.values(this.rolls), 1);

        for (let i = 1; i <= 20; i++) {
            const count = this.rolls[i];
            const percentage = this.totalRolls > 0
                ? ((count / this.totalRolls) * 100).toFixed(1)
                : 0;
            const barWidth = this.totalRolls > 0
                ? (count / maxCount) * 100
                : 0;

            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span class="stat-number">${i}</span>
                <div class="stat-bar-container">
                    <div class="stat-bar" style="width: ${barWidth}%">
                        <span class="stat-count">${count}</span>
                    </div>
                </div>
                <span class="stat-percentage">${percentage}%</span>
            `;
            this.distributionElement.appendChild(row);
        }

        // Update chart
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

            // Bar color based on deviation from expected
            const expected = this.totalRolls / 20;
            const deviation = Math.abs(count - expected) / expected;
            const hue = Math.max(0, 240 - deviation * 240); // Blue to red

            ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

            // Number labels
            if (i % 2 === 1) { // Show every other number to avoid crowding
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
