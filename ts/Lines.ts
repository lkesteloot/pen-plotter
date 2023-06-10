import { Bbox } from "./Bbox.ts";
import { Line } from "./Line.ts";
import { Vector } from "./Vector.ts";

export interface LineRenderingContext {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
}

class LinesContext implements LineRenderingContext {
    private readonly lines: Lines;
    private lastPoint: Vector = Vector.ZERO;
    private lastMoveTo: Vector = Vector.ZERO;

    constructor(lines: Lines) {
        this.lines = lines;
    }

    public moveTo(x: number, y: number): void {
        const p = new Vector(x, y);
        this.lastPoint = p;
        this.lastMoveTo = p;
    }

    public lineTo(x: number, y: number): void {
        const p = new Vector(x, y);
        this.lines.add(new Line(this.lastPoint, p));
        this.lastPoint = p;
    }

    public closePath(): void {
        this.lines.add(new Line(this.lastPoint, this.lastMoveTo));
        this.lastPoint = this.lastMoveTo;
    }
}

/**
 * A sequence of line segments.
 */
export class Lines {
    public readonly lines: Line[] = [];

    public add(line: Line): void {
        this.lines.push(line);
    }

    public colorize(passes: number): Lines[] {
        const linesPasses: Lines[] = [];

        for (let i = 0; i < passes; i++) {
            linesPasses.push(new Lines());
        }

        // Get the bounding box.
        const bbox = this.bbox();

        // Split up lines into passes.
        for (const line of this.lines) {
            const midpoint = line.p1.plus(line.p2).dividedBy(2);
            const t = (midpoint.x - bbox.min.x) / bbox.width();
            const pass = Math.min(Math.max(Math.round(t*passes + (Math.random() - 0.5)*1), 0), passes - 1);
            linesPasses[pass].add(line);
        }

        return linesPasses;
    }

    /**
     * Bounding box of all lines.
     */
    public bbox(): Bbox {
        const bbox = new Bbox(this.lines[0].p1);

        for (const line of this.lines) {
            bbox.addLine(line);
        }

        return bbox;
    }

    /**
     * Get an SVG path of this sequence of lines. Does not try particularly hard
     * to optimize it (e.g., reuse endpoints).
     */
    public toSvgPath(): string {
        const parts: string[] = [];

        for (const line of this.lines) {
            parts.push("M" + line.p1.x + " " + line.p1.y + " L" + line.p2.x + " " + line.p2.y);
        }

        return parts.join(" ");
    }

    /**
     * Make a new rendering context for this Lines object.
     */
    public getContext(): LineRenderingContext {
        return new LinesContext(this);
    }
}