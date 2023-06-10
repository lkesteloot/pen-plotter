
// Generates a draw to calibrate the width of the pen.

import { Rect } from "./Rect.ts";
import { DPI, GELLY_ROLL_PEN_SIZE_MM, MM_TO_INCH, Svg } from "./Svg.ts";
import { Vector } from "./Vector.ts";

async function main() {
    const pageSize = new Vector(8.5*DPI, 11*DPI);
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;
    const drawArea = page.insetBy(margin);

    const svg = new Svg(pageSize, true);

    for (let i = 1; i <= 10; i++) {
        const mm = i/10;

        const p1 = new Vector(drawArea.p.x + DPI*i*0.5, drawArea.p.y + DPI*2);
        const size = new Vector(mm*MM_TO_INCH*DPI, DPI*1);

        svg.drawRect(p1, p1.plus(size), GELLY_ROLL_PEN_SIZE_MM*MM_TO_INCH*DPI);
    }

    await svg.save("calibrate.svg");
}

await main();