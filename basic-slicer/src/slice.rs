use std::collections::VecDeque;

use crate::types::{Point2d, Point3d, Triangle};

#[derive(Debug)]
struct Line2d(Point2d, Point2d);

#[derive(Debug)]
struct Line3d(Point3d, Point3d);

fn zlerp(line: &Line3d, z: f64) -> Point3d {
    let lerp_fac = (z - line.0.z) / (line.1.z - line.0.z);
    Point3d {
        x: lerp_fac.mul_add(line.1.x - line.0.x, line.0.x),
        y: lerp_fac.mul_add(line.1.y - line.0.y, line.0.y),
        z: z,
    }
}

fn triangle_edges<'a>(tri: &Triangle) -> Vec<Line3d> {
    vec![
        Line3d(tri.pts[0], tri.pts[1]),
        Line3d(tri.pts[1], tri.pts[2]),
        Line3d(tri.pts[2], tri.pts[0]),
    ]
}

// exclusive
fn between<A: PartialOrd>(a: A, b: A, x: A) -> bool {
    return a < x && x < b || b < x && x < a;
}

fn flatten_z(p3d: Point3d) -> Point2d {
    Point2d { x: p3d.x, y: p3d.y }
}

fn intersect(tri: &Triangle, plane_z: f64) -> Option<Line2d> {
    // edge cases
    let plane_pts: Vec<&Point3d> = tri.pts.iter().filter(|p3d| p3d.z == plane_z).collect();
    if plane_pts.len() == 1 {
        return None;
    } else if plane_pts.len() == 2 {
        return Some(Line2d(flatten_z(*plane_pts[0]), flatten_z(*plane_pts[1])));
    } else if plane_pts.len() == 3 {
        // not technically correct because the whole triangle does intersect
        // but we'll just pretend they don't for slicing purposes
        // only focus on shells/walls
        return None;
    }

    let mut intersections = Vec::new();
    for edge in triangle_edges(tri) {
        if between(edge.0.z, edge.1.z, plane_z) {
            intersections.push(zlerp(&edge, plane_z));
        }
    }

    if intersections.len() == 0 {
        None
    } else if intersections.len() == 2 {
        Some(Line2d(
            flatten_z(intersections[0]),
            flatten_z(intersections[1]),
        ))
    } else {
        println!("{:?} {}", tri, plane_z);
        panic!(
            "plane intersected with triangle {} times",
            intersections.len()
        )
    }
}

#[derive(Debug)]
pub struct Layer {
    // doesn't do closed shapes but we don't need that for now
    // we're just drawing the segments
    pub segments: Vec<VecDeque<Point2d>>,
    pub z: f64,
}

// not super good but all values are within [0, 1]
// so it's good enough for now
fn float_equals(one: f64, two: f64) -> bool {
    return (one - two).abs() < 1e-6;
}

// float-equals version
fn points_almost_eq(pa: &Point2d, pb: &Point2d) -> bool {
    float_equals(pa.x, pb.x) && float_equals(pa.y, pb.y)
}

fn getter<'a>(is_front: bool, v: &'a VecDeque<Point2d>) -> &'a Point2d {
    if is_front {
        v.front().unwrap()
    } else {
        v.back().unwrap()
    }
}
fn pusher(is_front: bool, v: &mut VecDeque<Point2d>, obj: Point2d) {
    if is_front {
        v.push_front(obj);
    } else {
        v.push_back(obj);
    }
}
fn popper(is_front: bool, v: &mut VecDeque<Point2d>) -> Point2d {
    if is_front {
        v.pop_front().unwrap()
    } else {
        v.pop_back().unwrap()
    }
}

fn join_segments(segments: &mut Vec<VecDeque<Point2d>>) {
    'outer: loop {
        // addee: segment being added to
        // adder: segment being added to addee and then erased
        for addee_idx in 0..segments.len() {
            for adder_idx in (addee_idx + 1)..segments.len() {
                // truly disgusting code
                for addee_is_front in [true, false] {
                    for adder_is_front in [true, false] {
                        if points_almost_eq(
                            getter(addee_is_front, &segments[addee_idx]),
                            getter(adder_is_front, &segments[adder_idx]),
                        ) {
                            while segments[adder_idx].len() > 0 {
                                let popped = popper(adder_is_front, &mut segments[adder_idx]);
                                pusher(addee_is_front, &mut segments[addee_idx], popped);
                            }
                            segments.remove(adder_idx);
                            continue 'outer;
                        }
                    }
                }
            }
        }
        break;
    }
}

// slow as a dog that can't walk too good because it's missing a leg or something like that.
pub fn slice(triangles: &Vec<Triangle>, layers: u32) -> Vec<Layer> {
    let mut x_min = f64::INFINITY;
    let mut x_max = f64::NEG_INFINITY;

    let mut y_min = f64::INFINITY;
    let mut y_max = f64::NEG_INFINITY;

    let mut z_min = f64::INFINITY;
    let mut z_max = f64::NEG_INFINITY;

    for tri in &*triangles {
        for point in tri.pts {
            x_min = f64::min(x_min, point.x);
            x_max = f64::max(x_max, point.x);

            y_min = f64::min(y_min, point.y);
            y_max = f64::max(y_max, point.y);

            z_min = f64::min(z_min, point.z);
            z_max = f64::max(z_max, point.z);
        }
    }

    let range = f64::max(x_max - x_min, y_max - y_min);
    let norm_func = |point: Point2d| Point2d {
        x: (point.x - x_min) / range,
        y: (point.y - y_min) / range,
    };

    let layer_height = (z_max - z_min) / (layers as f64);
    let mut layers = Vec::new();
    let mut curr_z = z_min;
    loop {
        let mut segments: Vec<VecDeque<Point2d>> = Vec::new();

        let mut had_intersection = false;
        for tri in triangles {
            if let Some(intersection) = intersect(tri, curr_z) {
                had_intersection = true;
                let mut new_seg = VecDeque::new();
                new_seg.push_back(norm_func(intersection.0));
                new_seg.push_back(norm_func(intersection.1));
                segments.push(new_seg);
                join_segments(&mut segments);
            }
        }

        if !had_intersection {
            break;
        } else {
            layers.push(Layer {
                segments,
                z: curr_z,
            });
            curr_z += layer_height;
        }
    }
    layers
}
