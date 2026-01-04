/**
 * C++ LVGL Parser
 * 
 * This module parses C++ files containing LVGL UI code and extracts
 * widget hierarchies, properties, and styles for import into EEZ Studio.
 */

export interface LVGLWidget {
    type: string; // e.g., "lv_obj", "lv_label", "lv_btn"
    variableName: string; // e.g., "scale_label", "tare_btn"
    parent: string | null; // parent variable name
    properties: Map<string, any>;
    styles: Map<string, any>;
    position: { x: number; y: number };
    size: { width: number | string; height: number | string };
    children: LVGLWidget[];
    sourceLineStart: number;
    sourceLineEnd: number;
}

export interface ParsedLVGLFile {
    fileName: string;
    widgets: LVGLWidget[];
    globalVariables: Map<string, string>; // variable name -> type
    functions: Map<string, string[]>; // function name -> lines of code
}

/**
 * Main parser class for C++ LVGL files
 */
export class LVGLCppParser {
    private currentFile: string = "";
    private lines: string[] = [];
    private widgets: LVGLWidget[] = [];
    private globalVars: Map<string, string> = new Map();
    private currentLineIndex: number = 0;

    /**
     * Parse a C++ file containing LVGL code
     */
    parse(fileName: string, content: string): ParsedLVGLFile {
        this.currentFile = fileName;
        this.lines = content.split('\n');
        this.widgets = [];
        this.globalVars = new Map();
        this.currentLineIndex = 0;

        // Extract global variable declarations
        this.extractGlobalVariables();

        // Parse widget creation and configuration
        this.parseWidgets();

        return {
            fileName: this.currentFile,
            widgets: this.widgets,
            globalVariables: this.globalVars,
            functions: new Map()
        };
    }

    /**
     * Extract global lv_obj_t variable declarations
     */
    private extractGlobalVariables(): void {
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            
            // Match: lv_obj_t * variable_name = NULL;
            const globalVarMatch = line.match(/lv_obj_t\s*\*\s*(\w+)\s*=\s*NULL\s*;/);
            if (globalVarMatch) {
                const varName = globalVarMatch[1];
                this.globalVars.set(varName, "lv_obj_t");
            }
        }
    }

    /**
     * Parse widget creation and configuration
     */
    private parseWidgets(): void {
        const widgetMap = new Map<string, LVGLWidget>();

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i].trim();

            // Match widget creation: variable = lv_type_create(parent);
            const createMatch = line.match(/(\w+)\s*=\s*lv_(\w+)_create\(([^)]+)\)\s*;/);
            if (createMatch) {
                const varName = createMatch[1];
                const widgetType = createMatch[2];
                const parentName = createMatch[3].trim();

                const widget: LVGLWidget = {
                    type: `lv_${widgetType}`,
                    variableName: varName,
                    parent: parentName === "parent" ? null : parentName,
                    properties: new Map(),
                    styles: new Map(),
                    position: { x: 0, y: 0 },
                    size: { width: "auto", height: "auto" },
                    children: [],
                    sourceLineStart: i,
                    sourceLineEnd: i
                };

                widgetMap.set(varName, widget);
                this.widgets.push(widget);
            }

            // Match property setters
            this.parsePropertySetters(line, i, widgetMap);

            // Match style setters
            this.parseStyleSetters(line, i, widgetMap);

            // Match layout functions
            this.parseLayoutFunctions(line, i, widgetMap);
        }

        // Build parent-child relationships
        this.buildHierarchy(widgetMap);
    }

    /**
     * Parse property setting functions
     */
    private parsePropertySetters(line: string, lineIndex: number, widgetMap: Map<string, LVGLWidget>): void {
        // lv_label_set_text(label, "text");
        const textMatch = line.match(/lv_\w+_set_text\((\w+),\s*"([^"]+)"\s*\)/);
        if (textMatch) {
            const varName = textMatch[1];
            const text = textMatch[2];
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.properties.set("text", text);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_set_size(obj, width, height);
        const sizeMatch = line.match(/lv_obj_set_size\((\w+),\s*([^,]+),\s*([^)]+)\)/);
        if (sizeMatch) {
            const varName = sizeMatch[1];
            const width = this.parseSize(sizeMatch[2].trim());
            const height = this.parseSize(sizeMatch[3].trim());
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.size.width = width;
                widget.size.height = height;
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_arc_set_value(arc, value);
        const valueMatch = line.match(/lv_\w+_set_value\((\w+),\s*([^)]+)\)/);
        if (valueMatch) {
            const varName = valueMatch[1];
            const value = valueMatch[2].trim();
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.properties.set("value", value);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_arc_set_range(arc, min, max);
        const rangeMatch = line.match(/lv_\w+_set_range\((\w+),\s*([^,]+),\s*([^)]+)\)/);
        if (rangeMatch) {
            const varName = rangeMatch[1];
            const min = rangeMatch[2].trim();
            const max = rangeMatch[3].trim();
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.properties.set("range_min", min);
                widget.properties.set("range_max", max);
                widget.sourceLineEnd = lineIndex;
            }
        }
    }

    /**
     * Parse style setting functions
     */
    private parseStyleSetters(line: string, lineIndex: number, widgetMap: Map<string, LVGLWidget>): void {
        // lv_obj_set_style_bg_color(obj, lv_color_hex(0x001122), 0);
        const bgColorMatch = line.match(/lv_obj_set_style_bg_color\((\w+),\s*lv_color_hex\((0x[0-9A-Fa-f]+)\)/);
        if (bgColorMatch) {
            const varName = bgColorMatch[1];
            const color = bgColorMatch[2];
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.styles.set("bg_color", color);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_set_style_text_color(obj, lv_color_hex(0x00FFFF), 0);
        const textColorMatch = line.match(/lv_obj_set_style_text_color\((\w+),\s*lv_color_hex\((0x[0-9A-Fa-f]+)\)/);
        if (textColorMatch) {
            const varName = textColorMatch[1];
            const color = textColorMatch[2];
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.styles.set("text_color", color);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_set_style_text_font(obj, &lv_font_montserrat_24, 0);
        const fontMatch = line.match(/lv_obj_set_style_text_font\((\w+),\s*&(lv_font_\w+)/);
        if (fontMatch) {
            const varName = fontMatch[1];
            const font = fontMatch[2];
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.styles.set("text_font", font);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_set_style_radius(obj, value, 0);
        const radiusMatch = line.match(/lv_obj_set_style_radius\((\w+),\s*([^,]+)/);
        if (radiusMatch) {
            const varName = radiusMatch[1];
            const radius = radiusMatch[2].trim();
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.styles.set("radius", radius);
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_set_style_border_opa(obj, LV_OPA_0, 0);
        const borderOpaMatch = line.match(/lv_obj_set_style_border_opa\((\w+),\s*([^,]+)/);
        if (borderOpaMatch) {
            const varName = borderOpaMatch[1];
            const opa = borderOpaMatch[2].trim();
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.styles.set("border_opa", opa);
                widget.sourceLineEnd = lineIndex;
            }
        }
    }

    /**
     * Parse layout/positioning functions
     */
    private parseLayoutFunctions(line: string, lineIndex: number, widgetMap: Map<string, LVGLWidget>): void {
        // lv_obj_align(obj, LV_ALIGN_CENTER, x, y);
        const alignMatch = line.match(/lv_obj_align\((\w+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
        if (alignMatch) {
            const varName = alignMatch[1];
            const align = alignMatch[2].trim();
            const x = parseInt(alignMatch[3].trim()) || 0;
            const y = parseInt(alignMatch[4].trim()) || 0;
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.properties.set("align", align);
                widget.position.x = x;
                widget.position.y = y;
                widget.sourceLineEnd = lineIndex;
            }
        }

        // lv_obj_center(obj);
        const centerMatch = line.match(/lv_obj_center\((\w+)\)/);
        if (centerMatch) {
            const varName = centerMatch[1];
            const widget = widgetMap.get(varName);
            if (widget) {
                widget.properties.set("align", "LV_ALIGN_CENTER");
                widget.sourceLineEnd = lineIndex;
            }
        }
    }

    /**
     * Parse size value (handles LV_PCT, numeric values, etc.)
     */
    private parseSize(sizeStr: string): number | string {
        if (sizeStr.includes("LV_PCT")) {
            const match = sizeStr.match(/LV_PCT\((\d+)\)/);
            if (match) {
                return `${match[1]}%`;
            }
        }
        const num = parseInt(sizeStr);
        return isNaN(num) ? sizeStr : num;
    }

    /**
     * Build parent-child hierarchy
     */
    private buildHierarchy(widgetMap: Map<string, LVGLWidget>): void {
        for (const widget of widgetMap.values()) {
            if (widget.parent && widget.parent !== "parent") {
                const parentWidget = widgetMap.get(widget.parent);
                if (parentWidget) {
                    parentWidget.children.push(widget);
                }
            }
        }
    }
}

/**
 * Parse multiple C++ files from an Arduino project
 */
export function parseArduinoLVGLProject(files: { fileName: string; content: string }[]): ParsedLVGLFile[] {
    const parser = new LVGLCppParser();
    const results: ParsedLVGLFile[] = [];

    for (const file of files) {
        try {
            const parsed = parser.parse(file.fileName, file.content);
            if (parsed.widgets.length > 0) {
                results.push(parsed);
            }
        } catch (error) {
            console.error(`Error parsing ${file.fileName}:`, error);
        }
    }

    return results;
}
