use wasm_bindgen::prelude::wasm_bindgen;

use crate::{
    parse::stl,
    slice::{Layer, slice},
    types::Point2d,
};

// toss the error messages
#[wasm_bindgen]
pub fn buf_to_layers(num_layers: usize, buffer: &[u8]) -> Option<*const Vec<Layer>> {
    let (_, tris) = stl(buffer).ok()?;
    let layers = slice(&tris, num_layers);
    Some(Box::into_raw(Box::new(layers)))
}

#[wasm_bindgen]
pub unsafe fn layer_segments(layer_idx: usize, layers: *const Vec<Layer>) -> usize {
    unsafe { (*layers)[layer_idx].segments.len() }
}

#[wasm_bindgen]
pub unsafe fn get_segment(
    layer_idx: usize,
    segment_idx: usize,
    layers: *const Vec<Layer>,
) -> Vec<Point2d> {
    unsafe { (*layers)[layer_idx].segments[segment_idx].clone() }
}

#[wasm_bindgen]
pub unsafe fn total_height(layers: *const Vec<Layer>) -> f64 {
    unsafe { (*layers).iter().map(|l| l.z_height).sum() }
}

#[wasm_bindgen]
pub unsafe fn get_layer_height(layer_idx: usize, layers: *const Vec<Layer>) -> f64 {
    unsafe { (*layers)[layer_idx].z_height }
}

#[wasm_bindgen]
pub unsafe fn release_layers(layers: *const Vec<Layer>) {
    unsafe {
        drop(Box::from_raw(layers.cast_mut()));
    }
}
