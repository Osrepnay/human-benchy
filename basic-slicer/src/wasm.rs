use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    parse::stl,
    slice::{Layer, rdp, slice, xy_transform},
    types::{Point2d, Transform, Triangle},
};

// toss error messages
#[wasm_bindgen]
pub fn parse_stl(buffer: &[u8]) -> Option<*const Vec<Triangle>> {
    let (_, tris) = stl(buffer).ok()?;
    Some(Box::into_raw(Box::new(tris)))
}

#[wasm_bindgen]
pub fn mk_transform(tris_raw: *const Vec<Triangle>) -> Transform {
    let tris = unsafe { &*tris_raw };
    xy_transform(tris)
}

#[wasm_bindgen]
pub unsafe fn slice_triangles(
    num_layers: usize,
    tris_raw: *const Vec<Triangle>,
) -> *const Vec<Layer> {
    let tris = unsafe { &*tris_raw };
    let layers = slice(tris, num_layers);
    Box::into_raw(Box::new(layers))
}

#[wasm_bindgen]
pub unsafe fn layer_segments(layer_idx: usize, layers: *const Vec<Layer>) -> usize {
    unsafe { layers.as_ref().unwrap()[layer_idx].segments.len() }
}

#[wasm_bindgen]
pub unsafe fn get_segment(
    layer_idx: usize,
    segment_idx: usize,
    layers: *const Vec<Layer>,
) -> Vec<Point2d> {
    unsafe { layers.as_ref().unwrap()[layer_idx].segments[segment_idx].clone() }
}

#[wasm_bindgen]
pub unsafe fn total_height(layers: *const Vec<Layer>) -> f64 {
    unsafe { (*layers).iter().map(|l| l.z_height).sum() }
}

#[wasm_bindgen]
pub unsafe fn get_layer_height(layer_idx: usize, layers: *const Vec<Layer>) -> f64 {
    unsafe { layers.as_ref().unwrap()[layer_idx].z_height }
}

#[wasm_bindgen]
pub fn rdp_js(points: Vec<Point2d>, tolerance: f64) -> Vec<Point2d> {
    rdp(&points, tolerance)
}

#[wasm_bindgen]
pub unsafe fn release_layers(layers: *const Vec<Layer>) {
    unsafe {
        drop(Box::from_raw(layers.cast_mut()));
    }
}
