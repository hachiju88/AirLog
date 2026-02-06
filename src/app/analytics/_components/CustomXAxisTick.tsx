'use client';

export const CustomXAxisTick = ({ x, y, payload }: any) => {
    const val = payload.value as string;
    // Expecting YYYY/MM/DD
    const parts = val.split('/');

    if (parts.length < 3) {
        // Fallback for unexpected format
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={12} textAnchor="middle" fill="#94A3B8" fontSize={10}>
                    {val}
                </text>
            </g>
        );
    }

    // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={12} textAnchor="middle" fill="#94A3B8" fontSize={10}>
                <tspan x="0" dy="0">{parts[0]}</tspan>
                <tspan x="0" dy="12">{parts[1]}/{parts[2]}</tspan>
            </text>
        </g>
    );
};
