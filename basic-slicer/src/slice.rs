use std::collections::VecDeque;

use crate::types::{Point2d, Point3d, Triangle};

#[derive(Debug)]
struct Line2d(Point2d, Point2d);

#[derive(Debug)]
struct Line3d(Point3d, Point3d);

fn zlerp(line: &Line3d, z: f32) -> Point3d {
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

fn intersect(tri: &Triangle, plane_z: f32) -> Option<Line2d> {
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
    pub z: f32,
}

// slow as a dog that can't walk too good because it's missing a leg or something like that.
pub fn slice(triangles: &Vec<Triangle>, layers: u32) -> Vec<Layer> {
    let mut lowest = f32::INFINITY;
    let mut highest = f32::NEG_INFINITY;
    for tri in triangles {
        for z in tri.pts {
            lowest = f32::min(lowest, z.z);
            highest = f32::max(highest, z.z);
        }
    }

    let layer_height = (highest - lowest) / (layers as f32);
    let mut layers = Vec::new();
    let mut curr_z = lowest;
    loop {
        let mut segments: Vec<VecDeque<Point2d>> = Vec::new();

        let mut had_intersection = false;
        for tri in triangles {
            if let Some(intersection) = intersect(tri, curr_z) {
                had_intersection = true;
                let mut found_segment = false;
                for segment in segments.iter_mut() {
                    // WEF (write everything four times)
                    if *segment.front().unwrap() == intersection.0 {
                        segment.push_front(intersection.1);
                        found_segment = true;
                    } else if *segment.front().unwrap() == intersection.1 {
                        segment.push_front(intersection.0);
                        found_segment = true;
                    } else if *segment.back().unwrap() == intersection.0 {
                        segment.push_back(intersection.1);
                        found_segment = true;
                    } else if *segment.back().unwrap() == intersection.1 {
                        segment.push_back(intersection.0);
                        found_segment = true;
                    }
                    if found_segment {
                        break;
                    }
                }
                if !found_segment {
                    let mut new_seg = VecDeque::new();
                    new_seg.push_back(intersection.0);
                    new_seg.push_back(intersection.1);
                    segments.push(new_seg)
                }
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

pub fn normalize(layers: &mut Vec<Layer>) {
    let mut x_min = f32::INFINITY;
    let mut y_min = f32::INFINITY;
    let mut x_max = f32::NEG_INFINITY;
    let mut y_max = f32::NEG_INFINITY;

    for layer in &mut *layers {
        for segment in &layer.segments {
            for point in segment {
                x_min = f32::min(x_min, point.x);
                y_min = f32::min(y_min, point.y);
                x_max = f32::max(x_max, point.x);
                y_max = f32::max(y_max, point.y);
            }
        }
    }

    let range = f32::max(x_max - x_min, y_max - y_min);
    let norm_func = |point: Point2d| Point2d {
        x: (point.x - x_min) / range,
        y: (point.y - y_min) / range,
    };

    for layer in layers {
        for segment in &mut layer.segments {
            for point in segment {
                *point = norm_func(*point);
            }
        }
    }
}
