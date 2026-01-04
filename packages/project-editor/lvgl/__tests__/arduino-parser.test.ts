/**
 * Tests for Arduino LVGL Parser and Importer
 * 
 * This file contains basic tests to verify the parser can handle
 * the FilaGauge main.cpp example and other Arduino LVGL code.
 */

import { LVGLCppParser, parseArduinoLVGLProject } from "../cpp-parser";

describe("LVGL C++ Parser", () => {
    test("should parse basic label creation", () => {
        const code = `
lv_obj_t * scale_label = NULL;

void create_screen(lv_obj_t * parent) {
    scale_label = lv_label_create(parent);
    lv_label_set_text(scale_label, "0.0g");
    lv_obj_set_style_text_color(scale_label, lv_color_hex(0x00FFFF), 0);
}
        `;

        const parser = new LVGLCppParser();
        const result = parser.parse("test.cpp", code);

        expect(result.widgets.length).toBe(1);
        expect(result.widgets[0].type).toBe("lv_label");
        expect(result.widgets[0].variableName).toBe("scale_label");
        expect(result.widgets[0].properties.get("text")).toBe("0.0g");
        expect(result.widgets[0].styles.get("text_color")).toBe("0x00FFFF");
    });

    test("should parse button with size", () => {
        const code = `
lv_obj_t * tare_btn = NULL;

void main_screen_create(lv_obj_t * parent) {
    tare_btn = lv_btn_create(parent);
    lv_obj_set_size(tare_btn, 90, 45);
    lv_obj_set_style_bg_color(tare_btn, lv_color_hex(0x001122), 0);
    lv_obj_align(tare_btn, LV_ALIGN_BOTTOM_LEFT, 35, -100);
}
        `;

        const parser = new LVGLCppParser();
        const result = parser.parse("test.cpp", code);

        expect(result.widgets.length).toBe(1);
        expect(result.widgets[0].type).toBe("lv_btn");
        expect(result.widgets[0].variableName).toBe("tare_btn");
        expect(result.widgets[0].size.width).toBe(90);
        expect(result.widgets[0].size.height).toBe(45);
        expect(result.widgets[0].styles.get("bg_color")).toBe("0x001122");
    });
});
