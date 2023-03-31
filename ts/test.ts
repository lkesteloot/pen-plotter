
import opentype from  "https://unpkg.com/opentype.js@1.3.4/dist/opentype.module.js";

const DPI = 96;
const CURVE_TIGHTNESS = 0; // 0 = Catmull-Rom splines, 1 = straight lines

export class Vector {
    public static ZERO = new Vector(0, 0);
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public static random(): Vector {
        return new Vector(Math.random(), Math.random());
    }

    public plus(p: Vector): Vector {
        return new Vector(this.x + p.x, this.y + p.y);
    }

    public minus(p: Vector): Vector {
        return new Vector(this.x - p.x, this.y - p.y);
    }

    public times(s: number | Vector): Vector {
        if (s instanceof Vector) {
            return new Vector(this.x*s.x, this.y*s.y);
        } else {
            return new Vector(this.x*s, this.y*s);
        }
    }

    public dividedBy(s: number | Vector): Vector {
        if (s instanceof Vector) {
            return new Vector(this.x/s.x, this.y/s.y);
        } else {
            return new Vector(this.x/s, this.y/s);
        }
    }

    public negate(): Vector {
        return new Vector(-this.x, -this.y);
    }

    public lengthSquared(): number {
        return this.dot(this);
    }

    public length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    public lerp(p: Vector, t: number): Vector {
        return this.plus(p.minus(this).times(t));
    }

    public perpendicular(): Vector {
        // 90 degrees counter-clockwise.
        return new Vector(this.y, -this.x);
    }

    public normalized(): Vector {
        const length = this.length();
        if (length === 0) {
            return Vector.ZERO;
        }
        return this.dividedBy(length);
    }

    public dot(p: Vector): number {
        return this.x*p.x + this.y*p.y;
    }

    public swap(): Vector {
        return new Vector(this.y, this.x);
    }
}

export class Rect {
    public readonly p: Vector;
    public readonly size: Vector;

    constructor(p: Vector, size: Vector) {
        this.p = p;
        this.size = size;
    }

    public static fromEnds(p1: Vector, p2: Vector): Rect {
        return new Rect(p1, p2.minus(p1));
    }

    public insetBy(s: number): Rect {
        return new Rect(this.p.plus(new Vector(s, s)), this.size.minus(new Vector(s*2, s*2)));
    }

    public randomPoint(): Vector {
        return Vector.random().times(this.size).plus(this.p);
    }

    public center(): Vector {
        return this.p.plus(this.size.times(0.5));
    }
}

export class Svg {
    private readonly size: Vector;
    private readonly parts: string[] = [];

    constructor(size: Vector) {
        this.size = size;

        this.parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>`);
        this.parts.push(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`);
        this.parts.push(`<svg width="${this.size.x}" height="${this.size.y}" viewBox="0 0 ${this.size.x} ${this.size.y}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    }

    public drawLine(p1: Vector, p2: Vector) {
        this.parts.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="blue" stroke-width="1"/>`);
    }

    public drawRect(p1: Vector, p2: Vector) {
        const size = p2.minus(p1);
        this.parts.push(`<rect x="${p1.x}" y="${p1.y}" width="${size.x}" height="${size.y}" stroke="blue" stroke-width="1" fill="none"/>`);
    }

    public drawCircle(c: Vector, r: number) {
        this.parts.push(`<circle cx="${c.x}" cy="${c.y}" r="${r}" stroke="black" stroke-width="1" fill="none"/>`);
    }

    public drawSpline(v: Vector[]) {
        const s = 1 - CURVE_TIGHTNESS;

        for (let i = 1; i < v.length - 2; i++) {
            const b0 = v[i];
            const b1 = v[i].plus(v[i + 1].minus(v[i - 1]).times(s/6));
            const b2 = v[i + 1].plus(v[i].minus(v[i + 2]).times(s/6));
            const b3 = v[i + 1];
            this.parts.push(`<path d="M ${b0.x} ${b0.y} C ${b1.x} ${b1.y}, ${b2.x} ${b2.y}, ${b3.x} ${b3.y}" stroke="black" stroke-width="1" fill="none"/>`);
        }
    }

    private makeSvgString(): string {
        return this.parts.join("\n") + "\n";
    }

    public async save(pathname: string) {
        this.parts.push(`</svg>`);
        await Deno.writeTextFile(pathname, this.makeSvgString());
    }
}

class Line {
    public readonly p1: Vector;
    public readonly p2: Vector;

    constructor(p1: Vector, p2: Vector) {
        this.p1 = p1;
        this.p2 = p2;
    }

    public translateBy(p: Vector): Line {
        return new Line(this.p1.plus(p), this.p2.plus(p));
    }

    public scaleBy(s: number | Vector): Line {
        return new Line(this.p1.times(s), this.p2.times(s));
    }

    public lerp(t: number): Vector {
        return this.p1.plus(this.p2.minus(this.p1).times(t));
    }
}

// An arbitrary closed shape, ordered counter-clockwise to include and clockwise to exclude.
class Shape {
    public readonly lines: Line[];

    constructor(lines?: Line[]) {
        this.lines = lines ?? [];
    }

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

    public translateBy(p: Vector): Shape {
        return new Shape(this.lines.map(line => line.translateBy(p)));
    }

    public scaleBy(s: number | Vector): Shape {
        return new Shape(this.lines.map(line => line.scaleBy(s)));
    }

    public centerIn(rect: Rect): Shape {
        const bbox = this.getBbox();
        const scaleBoth = rect.size.dividedBy(bbox.size);
        const scale = Math.min(scaleBoth.x, scaleBoth.y);

        return this
            .translateBy(bbox.center().negate())
            .scaleBy(scale)
            .translateBy(rect.center());
    }

    public isInside(p: Vector): boolean {
        let inside = false;

        for (const line of this.lines) {
            if ((line.p1.y < p.y && p.y <= line.p2.y) || (line.p2.y < p.y && p.y <= line.p1.y)) {
                const p12 = line.p2.minus(line.p1);
                const p1r = p.minus(line.p1);
                const t = p12.x*p1r.y/p12.y - p1r.x;
                if (t > 0) {
                    inside = !inside;
                }
            }
        }

        return inside;
    }

    public distanceToPoint(p: Vector): number {
        let closestDistance: number | undefined = undefined;

        for (const line of this.lines) {
            // Normal vector.
            const dl = line.p2.minus(line.p1); 
            const n = dl.perpendicular().normalized();
            if (n.lengthSquared() === 0) {
                continue;
            }

            // Dot with line endpoint.
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
            throw new Error("can't find distance, no lines in shape");
        }

        return closestDistance;
    }
}

class Circle {
    public readonly c: Vector;
    public readonly r: number;

    constructor(c: Vector, r: number) {
        this.c = c;
        this.r = r;
    }
}

function addCircle(circles: Circle[], drawArea: Rect, shape: Shape): boolean {
    const MAX_RADIUS = 0.5*DPI;

    for (let attempt = 0; attempt < 5000; attempt++) {
        const p = drawArea.randomPoint();
        let minDist = MAX_RADIUS;

        // Clip to draw area.
        // const p1 = p.minus(drawArea.p);
        // const p2 = drawArea.p.plus(drawArea.size).minus(p);
        // minDist = Math.min(minDist, p1.x, p1.y, p2.x, p2.y);

        // Clip to shape.
        if (shape.isInside(p)) {
            const dist = shape.distanceToPoint(p);
            if (dist > 0) {
                minDist = Math.min(minDist, dist);
            }
        } else {
            // Outside of shape.
            continue;
        }

        let insideCircle = false;
        for (const c of circles) {
            const dist2 = p.minus(c.c).lengthSquared();
            if (dist2 <= c.r*c.r) {
                // Inside a circle, pick a new point.
                insideCircle = true;
                break;
            }
            const dist = Math.sqrt(dist2) - c.r;
            if (dist < minDist) {
                minDist = dist;
            }
        }

        if (!insideCircle) {
            circles.push(new Circle(p, minDist));
            return true;
        }
    }

    return false;
}

async function makeTextShape(fontPathname: string, text: string): Promise<Shape> {
    const shape = new Shape();
    const rawFontBinary = await Deno.readFile(fontPathname);
    const font = opentype.parse(rawFontBinary.buffer, {});
    const path = font.getPath(text);
    let p = Vector.ZERO;
    let firstPoint: Vector | undefined = undefined;
    for (const command of path.commands) {
        //console.log(command);
        switch (command.type) {
            case "M":
                p = new Vector(command.x, command.y);
                if (firstPoint === undefined) {
                    firstPoint = p;
                }
                break;

            case "L": {
                const p2 = new Vector(command.x, command.y);
                shape.lines.push(new Line(p, p2));
                p = p2;
                break;
            }

            case "C": {
                const p2 = new Vector(command.x1, command.y1);
                const p3 = new Vector(command.x2, command.y2);
                const p4 = new Vector(command.x, command.y);
                shape.addBezier(p, p2, p3, p4);
                p = p4;
                break;
            }

            case "Z":
                if (firstPoint === undefined) {
                    throw new Error("cannot close path, we have no first point");
                }
                shape.lines.push(new Line(p, firstPoint));
                firstPoint = undefined;
                break;

            default:
                throw new Error("unknown path command: " + command.type);
        }
    }

    return shape;
}

function stackVertically(shapes: Shape[], gap: number): Shape {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Shape();
    let dy = 0;

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const bbox = bboxes[i];

        const p = bboxes[0].p.minus(bbox.p).plus(new Vector((bboxes[0].size.x - bbox.size.x)/2, dy));
        finalShape.lines.push(... shape.translateBy(p).lines);

        dy += bbox.size.y + gap;
    }

    return finalShape;
}

function stackHorizontally(shapes: Shape[], gap: number): Shape {
    const bboxes = shapes.map(shape => shape.getBbox());

    const finalShape = new Shape();
    let dx = 0;

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const bbox = bboxes[i];

        const p = bboxes[0].p.minus(bbox.p).plus(new Vector(dx, (bboxes[0].size.y - bbox.size.y)/2));
        finalShape.lines.push(... shape.translateBy(p).lines);

        dx += bbox.size.x + gap;
    }

    return finalShape;
}

async function main(): Promise<void> {
    const pageSize = new Vector(8.5*DPI, 11*DPI).swap();
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;

    const circles: Circle[] = [];

    const drawArea = page.insetBy(margin);

    const sfFontPathname = "/Library/Fonts/SF-Pro-Text-Regular.otf";
    const garamondFontPathname = "/Library/Fonts/AGaramondPro-Regular.otf";

    const shape1 = await makeTextShape(garamondFontPathname, "H");
    const shape2 = await makeTextShape(sfFontPathname, "♥");
    const shape3 = await makeTextShape(garamondFontPathname, "H");

    // const shape = stackVertically([shape1, shape2, shape3], 0.1*DPI);
    const shape = stackHorizontally([shape1, shape2, shape3], 0.0*DPI);
    const bigShape = shape.centerIn(drawArea);

    // const bigShape = shape2.centerIn(drawArea);
    // const bigShape2 = shape.centerIn(drawArea);
    // bigShape.lines.push(... shape.lines);

    while (circles.length < 2000 && true) {
        const succeeded = addCircle(circles, drawArea, bigShape);
        if (!succeeded) {
            console.log("Failed to add circle after " + circles.length + " circles");
            break;
        }
    }

    const svg = new Svg(pageSize);
    // svg.drawRect(Vector.ZERO, pageSize);
    // svg.drawRect(drawArea.p, drawArea.p.plus(drawArea.size));
    for (const circle of circles) {
        svg.drawCircle(circle.c, circle.r);
    }
    for (const line of bigShape.lines) {
        // svg.drawLine(line.p1, line.p2);
    }
    await svg.save("out.svg");
}

await main();
