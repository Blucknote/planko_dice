export function getColorForNumber(num) {
    if (num <= 7) return '#6366f1';
    if (num <= 14) return '#ffd700';
    return '#ef4444';
}

export function getHueForNumber(num) {
    return ((num - 1) / 19) * 300;
}

export function getColorForDeviation(deviation) {
    const hue = Math.max(0, 240 - deviation * 240);
    return `hsl(${hue}, 70%, 60%)`;
}
