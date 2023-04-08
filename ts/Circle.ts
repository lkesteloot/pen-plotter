import { Line } from "./Line.ts";
import { Vector } from "./Vector.ts";

/**
 * A circle, specified by its center and radius.
 */
export class Circle {
    public readonly c: Vector;
    public readonly r: number;

    constructor(c: Vector, r: number) {
        this.c = c;
        this.r = r;
    }

    /**
     * Find a circle that's tangent to these three lines. The lines
     * should be ordered consistently, like a polygon, though the direction
     * doesn't matter. Returns undefined if any pair of sequential lines are parallel.
     */
    public static circleTangentWith(l1: Line, l2: Line, l3: Line): Circle | undefined {
        const l12 = l1.bisectWith(l2.swap());
        const l23 = l2.bisectWith(l3.swap());
        if (l12 === undefined || l23 === undefined) {
            // Parallel.
            return undefined;
        }
        const center = l12.intersectWith(l23);
        if (center === undefined) {
            return undefined;
        }
        return new Circle(center, l1.distanceToPoint(center));
    }
}