import { Vector } from "./Vector.ts";

/**
 * A generic rectangle class, represented as the upper-left point and the size.
 */
export class Rect {
    public readonly p: Vector;
    public readonly size: Vector;

    constructor(p: Vector, size: Vector) {
        this.p = p;
        this.size = size;
    }

    /**
     * Construct are rectangle from its upper-left and lower-right points.
     */
    public static fromEnds(p1: Vector, p2: Vector): Rect {
        return new Rect(p1, p2.minus(p1));
    }

    /**
     * Shrink a rectangle by a constant distance on all four sides.
     */
    public insetBy(s: number): Rect {
        return new Rect(this.p.plus(new Vector(s, s)), this.size.minus(new Vector(s*2, s*2)));
    }

    /**
     * Generate a random point within a rectangle, inclusive of the left and top sides and
     * exclusive of the right and bottom sides.
     */
    public randomPoint(): Vector {
        return Vector.random().times(this.size).plus(this.p);
    }

    /**
     * A vector representing the center of the rectangle.
     */
    public center(): Vector {
        return this.p.plus(this.size.times(0.5));
    }
}
