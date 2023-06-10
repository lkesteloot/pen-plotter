import { Line } from "./Line.ts";
import { Vector } from "./Vector.ts";

/**
 * A two-dimensional bounding box. Never empty.
 */
export class Bbox {
    public min: Vector;
    public max: Vector;

    public constructor(p: Vector) {
        this.min = p;
        this.max = p;
    }

    public addPoint(p: Vector) {
        this.min = this.min.minWith(p);
        this.max = this.max.maxWith(p);
    }

    public addLine(line: Line) {
        this.addPoint(line.p1);
        this.addPoint(line.p2);
    }

    public width(): number {
        return this.max.x - this.min.x;
    }

    public height(): number {
        return this.max.y - this.min.y;
    }
}