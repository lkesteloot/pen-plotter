
const DPI = 72;
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

    public dividedBy(s: number): Vector {
        return new Vector(this.x/s, this.y/s);
    }

    public lengthSquared(): number {
        return this.x*this.x + this.y*this.y;
    }
}

export class Rect {
    public readonly p: Vector;
    public readonly size: Vector;

    constructor(p: Vector, size: Vector) {
        this.p = p;
        this.size = size;
    }

    public insetBy(s: number): Rect {
        return new Rect(this.p.plus(new Vector(s, s)), this.size.minus(new Vector(s*2, s*2)));
    }

    public randomPoint(): Vector {
        return Vector.random().times(this.size).plus(this.p);
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
        this.parts.push(`f.write("""<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="blue" stroke-width="1"/>`);
    }

    public drawRect(p1: Vector, p2: Vector) {
        const size = p2.minus(p1);
        this.parts.push(`f.write("""<rect x="${p1.x}" y="${p1.y}" width="${size.x}" y2="${size.y}" stroke="blue" stroke-width="1" fill="none"/>`);
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

class Circle {
    public readonly c: Vector;
    public readonly r: number;

    constructor(c: Vector, r: number) {
        this.c = c;
        this.r = r;
    }
}

function addCircle(circles: Circle[], drawArea: Rect): boolean {
    const MAX_RADIUS = 0.5*DPI;

    for (let attempt = 0; attempt < 5000; attempt++) {
        const p = drawArea.randomPoint();
        let minDist = MAX_RADIUS;
        const p1 = p.minus(drawArea.p);
        const p2 = drawArea.p.plus(drawArea.size).minus(p);
        minDist = Math.min(minDist, p1.x, p1.y, p2.x, p2.y);

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

async function main(): Promise<void> {
    const pageSize = new Vector(8.5*DPI, 11*DPI);
    const page = new Rect(Vector.ZERO, pageSize);
    const margin = 1*DPI;

    const circles: Circle[] = [];

    const drawArea = page.insetBy(margin);

    while (circles.length < 5000 && true) {
        const succeeded = addCircle(circles, drawArea);
        if (!succeeded) {
            console.log("Failed to add circle after " + circles.length + " circles");
            break;
        }
    }

    const svg = new Svg(pageSize);
    for (const circle of circles) {
        svg.drawCircle(circle.c, circle.r);
    }
    await svg.save("out.svg");
}

await main();
