use wasm_bindgen::prelude::wasm_bindgen;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point3d {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Point2d {
    pub x: f64,
    pub y: f64,
}

#[wasm_bindgen]
impl Point2d {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }
}

#[derive(Clone, Debug)]
pub struct Triangle {
    pub pts: [Point3d; 3],
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct Transform {
    pub scale: f64,
    pub x_offset: f64,
    pub y_offset: f64,
    pub z_offset: f64,
}
