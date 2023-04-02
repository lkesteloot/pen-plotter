import { Vector } from "./Vector.ts";

/**
 * Represents a line with two endpoints.
 */
export class Line {
    public readonly p1: Vector;
    public readonly p2: Vector;

    constructor(p1: Vector, p2: Vector) {
        this.p1 = p1;
        this.p2 = p2;
    }

    /**
     * Move both endpoints by the specified vector.
     */
    public translateBy(p: Vector): Line {
        return new Line(this.p1.plus(p), this.p2.plus(p));
    }

    /**
     * Scale both endpoints by the specified vector (piece-wise) or scalar.
     */
    public scaleBy(s: number | Vector): Line {
        return new Line(this.p1.times(s), this.p2.times(s));
    }

    /**
     * Return the point "t" of the way from p1 (t = 0) to p2 (t = 1).
     */
    public lerp(t: number): Vector {
        return this.p1.plus(this.p2.minus(this.p1).times(t));
    }
}