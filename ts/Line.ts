import { Circle } from "./Circle.ts";
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
     * Line with same p1 but p2's distance multiplied by s.
     */
    public multiplyLengthBy(s: number): Line {
        return new Line(this.p1, this.p1.plus(this.asVector().times(s)));
    }

    /**
     * This line with the points swapped.
     */
    public swap(): Line {
        return new Line(this.p2, this.p1);
    }

    /**
     * This line as a vector from p1 to p2.
     */
    public asVector(): Vector {
        return this.p2.minus(this.p1);
    }

    /**
     * Return the point "t" of the way from p1 (t = 0) to p2 (t = 1).
     */
    public lerp(t: number): Vector {
        return this.p1.plus(this.p2.minus(this.p1).times(t));
    }

    /**
     * Returns the closest distance from the line (not line segment)
     * to the specified point.
     */
    public distanceToPoint(p: Vector): number {
        const n = this.asVector().perpendicular().normalized();
        return Math.abs(p.minus(this.p1).dot(n));
    }

    /**
     * The bisector between this line and the specified line, or undefined if the lines
     * are parallel. The new line starts at the intersection of the two lines, and
     * goes in the direction of the two lines. The length is unspecified.
     */
    public bisectWith(o: Line): Line | undefined {
        const p = this.intersectWith(o);
        if (p === undefined) {
            return undefined;
        }

        const v1 = this.asVector().normalized();
        const v2 = o.asVector().normalized();

        return new Line(p, p.plus(v1).plus(v2));
    }

    /**
     * The intersection point of this line and the specified line
     * (not line segments), or undefined if they're parallel.
     */
    public intersectWith(o: Line): Vector | undefined {
        const d = this.p1.minus(o.p1);
        const tv = this.asVector();
        const ov = o.asVector();

        // Find how far along our own ray we intersect the other line.
        const denom = tv.det(ov);
        if (Math.abs(denom) < 1e-3) {
            return undefined;
        }
        const t = ov.det(d) / denom;
        return this.p1.plus(tv.times(t));
    }
}