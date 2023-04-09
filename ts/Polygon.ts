import { Circle } from "./Circle.ts";
import { Line } from "./Line.ts";
import { Rect } from "./Rect.ts";
import { Vector } from "./Vector.ts";

/**
 * An arbitrary closed polygon, ordered counter-clockwise to include and clockwise to exclude.
 */
export class Polygon {
    public readonly lines: Line[];

    constructor(lines?: Line[]) {
        this.lines = lines ?? [];
    }

    /**
     * Make a polygon from a list of points.
     */
    public static fromPoints(points: Vector[]): Polygon {
        const polygon = new Polygon();

        for (let i = 0; i < points.length; i++) {
            polygon.lines.push(new Line(points[i], points[(i + 1) % points.length]));
        }

        return polygon;
    }

    /**
     * Make a polygon from a list of points, where the last point is equal to the first one.
     */
    public static fromClosedPoints(points: Vector[]): Polygon {
        const polygon = new Polygon();

        for (let i = 0; i < points.length - 1; i++) {
            polygon.lines.push(new Line(points[i], points[i + 1]));
        }

        return polygon;
    }
    
    /**
     * Add a Bezier curve to the polygon. The curve is broken down into line segments.
     */
    public addBezier(p1: Vector, p2: Vector, p3: Vector, p4: Vector) {
        const COUNT = 10;
        const points: Vector[] = [];

        for (let i = 0; i < COUNT + 1; i++) {
            const t = i/COUNT;

            const p12 = p1.lerp(p2, t);
            const p23 = p2.lerp(p3, t);
            const p34 = p3.lerp(p4, t);

            const p123 = p12.lerp(p23, t);
            const p234 = p23.lerp(p34, t);

            const p1234 = p123.lerp(p234, t);
            
            points.push(p1234);
        }

        for (let i = 0; i < points.length - 1; i++) {
            this.lines.push(new Line(points[i], points[i + 1]));
        }
    }

    /**
     * Computes the bounding box of the polygon.
     */
    public getBbox(): Rect {
        let x1 = this.lines[0].p1.x;
        let y1 = this.lines[0].p1.y;
        let x2 = this.lines[0].p1.x;
        let y2 = this.lines[0].p1.y;

        for (const line of this.lines) {
            x1 = Math.min(x1, line.p1.x, line.p2.x);
            y1 = Math.min(y1, line.p1.y, line.p2.y);
            x2 = Math.max(x2, line.p1.x, line.p2.x);
            y2 = Math.max(y2, line.p1.y, line.p2.y);
        }

        const p1 = new Vector(x1, y1);
        const p2 = new Vector(x2, y2);

        return Rect.fromEnds(p1, p2);
    }

    /**
     * Move the polygon by the specified vector.
     */
    public translateBy(p: Vector): Polygon {
        return new Polygon(this.lines.map(line => line.translateBy(p)));
    }

    /**
     * Scale the polygon by the specified vector (piece-wise) or scalar.
     */
    public scaleBy(s: number | Vector): Polygon {
        return new Polygon(this.lines.map(line => line.scaleBy(s)));
    }

    /**
     * Center this polygon in the specified rectangle. The new location is the
     * original polygon as large as it can by while fully fitting in the rectangle.
     */
    public centerIn(rect: Rect): Polygon {
        const bbox = this.getBbox();
        const scaleBoth = rect.size.dividedBy(bbox.size);
        const scale = Math.min(scaleBoth.x, scaleBoth.y);

        return this
            .translateBy(bbox.center().negate())
            .scaleBy(scale)
            .translateBy(rect.center());
    }

    /**
     * Whether the specified point is inside the polygon. If the polygon overlaps itself, the
     * point is considered inside if it's inside an odd number of lines.
     */
    public isInside(p: Vector): boolean {
        let inside = false;

        // In this algorithm we shoot a ray to the right (positive X) and
        // see how many line segments we intersect with. If the number is
        // odd, we're inside.
        for (const line of this.lines) {
            // See if our point overlaps vertically with this line segment.
            if ((line.p1.y < p.y && p.y <= line.p2.y) || (line.p2.y < p.y && p.y <= line.p1.y)) {
                // Find the intersection between our ray and this line.
                const p12 = line.p2.minus(line.p1);
                const p1r = p.minus(line.p1);
                const t = p12.x*p1r.y/p12.y - p1r.x;
                // See if the intersection is to the right.
                if (t > 0) {
                    inside = !inside;
                }
            }
        }

        return inside;
    }

    /**
     * Computes the closest distance from the given point to the polygon.
     */
    public distanceToPoint(p: Vector): number {
        let closestDistance: number | undefined = undefined;

        // Try every line segment, to see which is closest.
        for (const line of this.lines) {
            // Normal vector.
            const dl = line.p2.minus(line.p1); 
            const n = dl.perpendicular().normalized();
            if (n.lengthSquared() === 0) {
                continue;
            }

            // Dot with line endpoint. This finds the distance between
            // the point and the line (not line segment).
            const dot = n.dot(p.minus(line.p1));

            // Project back to line.
            let pp = p.minus(n.times(dot));

            // Find distance along line.
            let t: number;
            if (Math.abs(dl.x) > Math.abs(dl.y)) {
                t = (pp.x - line.p1.x)/dl.x;
            } else {
                t = (pp.y - line.p1.y)/dl.y;
            }

            // Clamp to line segment.
            t = Math.max(Math.min(t, 1), 0);

            // Put back on line.
            pp = line.lerp(t);

            // Find distance.
            const dist = p.minus(pp).length();

            if (closestDistance === undefined || dist < closestDistance) {
                closestDistance = dist;
            }
        }

        if (closestDistance === undefined) {
            throw new Error("can't find distance, no lines in polygon");
        }

        return closestDistance;
    }

    public largestInscribedCircle(): Circle | undefined {
        let bestCircle: Circle | undefined;

        for (let i = 0; i < this.lines.length; i++) {
            for (let j = i + 1; j < this.lines.length; j++) {
                for (let k = j + 1; k < this.lines.length; k++) {
                    const circle = Circle.circleTangentWith(
                        this.lines[i],
                        this.lines[j],
                        this.lines[k]);
                    if (circle !== undefined && (bestCircle === undefined || circle.r > bestCircle.r)) {
                        let tooLarge = false;
                        for (const line of this.lines) {
                            const dist = line.distanceToPoint(circle.c);
                            if (dist < circle.r - 1e-3) {
                                tooLarge = true;
                                break;
                            }
                        }

                        if (!tooLarge) {
                            bestCircle = circle;
                        }
                    }
                }
            }
        }

        return bestCircle;
    }

    /**
     * Return the center of mass of the polygon. Assumes the polygon is not self-intersecting,
     * but it's permitted to be concave.
     * 
     * https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
     */
    public getCentroid(): Vector {
        let totalArea = 0;
        let c = Vector.ZERO;

        for (const line of this.lines) {
            const segmentArea = line.p1.det(line.p2);
            totalArea += segmentArea;
            c = c.plus(line.p1.plus(line.p2).times(segmentArea));
        }

        totalArea /= 2;
        return c.dividedBy(totalArea*6);
    }
}