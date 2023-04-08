
/**
 * 2D vector.
 */
export class Vector {
    public static ZERO = new Vector(0, 0);
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    /**
     * Generate a random vector with each component between 0 (inclusive) and 1 (exclusive).
     */
    public static random(): Vector {
        return new Vector(Math.random(), Math.random());
    }

    /**
     * Create a new vector from a two-element array.
     */
    public static fromArray(p: [number, number]): Vector {
        return new Vector(p[0], p[1]);
    }

    /**
     * This vector as a two-element array.
     */
    public toArray(): [number, number] {
        return [this.x, this.y];
    }

    /**
     * Return the sum of this vector and the given vector.
     */
    public plus(p: Vector): Vector {
        return new Vector(this.x + p.x, this.y + p.y);
    }

    /**
     * Return the difference between this vector and the given vector.
     */
    public minus(p: Vector): Vector {
        return new Vector(this.x - p.x, this.y - p.y);
    }

    /**
     * Return the product of this vector and the given vector (piece-wise) or the scalar.
     */
    public times(s: number | Vector): Vector {
        if (s instanceof Vector) {
            return new Vector(this.x*s.x, this.y*s.y);
        } else {
            return new Vector(this.x*s, this.y*s);
        }
    }

    /**
     * Return the result of dividing this vector by the given vector (piece-wise) or the scalar.
     */
    public dividedBy(s: number | Vector): Vector {
        if (s instanceof Vector) {
            return new Vector(this.x/s.x, this.y/s.y);
        } else {
            return new Vector(this.x/s, this.y/s);
        }
    }

    /**
     * Return this vector with both components negated.
     */
    public negate(): Vector {
        return new Vector(-this.x, -this.y);
    }

    /**
     * Return the square of the length of this vector.
     */
    public lengthSquared(): number {
        return this.dot(this);
    }

    /**
     * Return the length of this vector.
     */
    public length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    /**
     * Return a new vector, linearly interporated between this vector (t = 0) and
     * the given vector (t = 1).
     */
    public lerp(p: Vector, t: number): Vector {
        return this.plus(p.minus(this).times(t));
    }

    /**
     * Return this vector rotated 90 degrees counter-clockwise.
     */
    public perpendicular(): Vector {
        return new Vector(this.y, -this.x);
    }

    /**
     * Return this vector normalized to length 1. If the vector is of length
     * zero, a zero vector is returned.
     */
    public normalized(): Vector {
        const length = this.length();
        if (length === 0) {
            return Vector.ZERO;
        }
        return this.dividedBy(length);
    }

    /**
     * Return the dot product between this vector and the given vector.
     */
    public dot(p: Vector): number {
        return this.x*p.x + this.y*p.y;
    }

    /**
     * Return this vector with its components swapped.
     */
    public swap(): Vector {
        return new Vector(this.y, this.x);
    }

    /**
     * Determinant of the matrix with this on top and p on the bottom.
     */
    public det(p: Vector): number {
        return this.x*p.y - p.x*this.y;
    }
}
