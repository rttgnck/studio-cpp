/**
 * Arduino LVGL Code Generator
 * 
 * Generates Arduino C++ code from EEZ Studio LVGL projects
 */

import fs from "fs";
import path from "path";

export interface CodeGenerationOptions {
    preserveComments?: boolean;
    preserveEventHandlers?: boolean;
    indentSize?: number;
}

export interface GeneratedCode {
    fileName: string;
    code: string;
}

/**
 * Generate C++ code for LVGL widgets
 */
export class LVGLCodeGenerator {
    private indent: number = 0;
    private indentSize: number = 4;
    private code: string[] = [];

    constructor(options?: CodeGenerationOptions) {
        if (options?.indentSize) {
            this.indentSize = options.indentSize;
        }
    }

    /**
     * Add a line of code with current indentation
     */
    private addLine(line: string) {
        const indentation = " ".repeat(this.indent * this.indentSize);
        this.code.push(indentation + line);
    }

    /**
     * Increase indentation level
     */
    private indentMore() {
        this.indent++;
    }

    /**
     * Decrease indentation level
     */
    private indentLess() {
        if (this.indent > 0) {
            this.indent--;
        }
    }

    /**
     * Generate code for a widget
     */
    generateWidget(widget: any, parentVar: string = "parent"): string {
        const varName = widget.identifier || `obj_${Math.random().toString(36).substr(2, 9)}`;
        const widgetType = this.getWidgetTypeFromEEZ(widget.type);

        // Widget creation
        this.addLine(`${varName} = lv_${widgetType}_create(${parentVar});`);

        // Set size
        if (widget.width && widget.height) {
            const width = this.convertSize(widget.width, widget.widthUnit);
            const height = this.convertSize(widget.height, widget.heightUnit);
            this.addLine(`lv_obj_set_size(${varName}, ${width}, ${height});`);
        }

        // Set position/alignment
        if (widget.leftUnit && widget.leftUnit !== "px") {
            // Use alignment
            const align = this.getAlignment(widget.leftUnit, widget.topUnit);
            const x = widget.left || 0;
            const y = widget.top || 0;
            if (align === "LV_ALIGN_CENTER" && x === 0 && y === 0) {
                this.addLine(`lv_obj_center(${varName});`);
            } else {
                this.addLine(`lv_obj_align(${varName}, ${align}, ${x}, ${y});`);
            }
        } else {
            // Use absolute position
            this.addLine(`lv_obj_set_pos(${varName}, ${widget.left || 0}, ${widget.top || 0});`);
        }

        // Widget-specific properties
        if (widget.type === "LVGLLabelWidget" && widget.text) {
            this.addLine(`lv_label_set_text(${varName}, "${widget.text}");`);
        }

        if (widget.rangeMin !== undefined && widget.rangeMax !== undefined) {
            this.addLine(`lv_${widgetType}_set_range(${varName}, ${widget.rangeMin}, ${widget.rangeMax});`);
        }

        if (widget.value !== undefined) {
            this.addLine(`lv_${widgetType}_set_value(${varName}, ${widget.value});`);
        }

        // Apply styles
        if (widget.localStyles && widget.localStyles.definition) {
            this.generateStyles(varName, widget.localStyles.definition);
        }

        // Add blank line for readability
        this.addLine("");

        // Generate child widgets
        if (widget.children && widget.children.length > 0) {
            for (const child of widget.children) {
                this.generateWidget(child, varName);
            }
        }

        return this.code.join("\n");
    }

    /**
     * Generate style code
     */
    private generateStyles(varName: string, definition: any) {
        // Generate styles for MAIN part, DEFAULT state
        const mainDefault = definition?.MAIN?.DEFAULT;
        if (!mainDefault) return;

        for (const [styleProp, styleValue] of Object.entries(mainDefault)) {
            if (styleValue && typeof styleValue === 'object' && 'value' in styleValue) {
                const value = (styleValue as any).value;
                this.addLine(`lv_obj_set_style_${styleProp}(${varName}, ${value}, 0);`);
            }
        }
    }

    /**
     * Convert EEZ Studio widget type to LVGL type
     */
    private getWidgetTypeFromEEZ(eezType: string): string {
        const mapping: { [key: string]: string } = {
            'LVGLContainerWidget': 'obj',
            'LVGLLabelWidget': 'label',
            'LVGLButtonWidget': 'btn',
            'LVGLArcWidget': 'arc',
            'LVGLSliderWidget': 'slider',
            'LVGLBarWidget': 'bar',
            'LVGLCheckboxWidget': 'checkbox',
            'LVGLSwitchWidget': 'switch',
            'LVGLDropdownWidget': 'dropdown',
            'LVGLImageWidget': 'img',
            'LVGLTextareaWidget': 'textarea',
            'LVGLKeyboardWidget': 'keyboard',
            'LVGLChartWidget': 'chart',
            'LVGLTableWidget': 'table',
            'LVGLSpinnerWidget': 'spinner',
            'LVGLRollerWidget': 'roller',
            'LVGLMeterWidget': 'meter'
        };

        return mapping[eezType] || 'obj';
    }

    /**
     * Convert size value
     */
    private convertSize(size: any, unit: string): string {
        if (unit === '%') {
            return `LV_PCT(${size})`;
        }
        return String(size);
    }

    /**
     * Get LVGL alignment constant
     */
    private getAlignment(leftUnit: string, topUnit: string): string {
        const alignments: { [key: string]: string } = {
            'center-center': 'LV_ALIGN_CENTER',
            'left-top': 'LV_ALIGN_TOP_LEFT',
            'center-top': 'LV_ALIGN_TOP_MID',
            'right-top': 'LV_ALIGN_TOP_RIGHT',
            'left-center': 'LV_ALIGN_LEFT_MID',
            'right-center': 'LV_ALIGN_RIGHT_MID',
            'left-bottom': 'LV_ALIGN_BOTTOM_LEFT',
            'center-bottom': 'LV_ALIGN_BOTTOM_MID',
            'right-bottom': 'LV_ALIGN_BOTTOM_RIGHT'
        };

        const key = `${leftUnit}-${topUnit}`;
        return alignments[key] || 'LV_ALIGN_TOP_LEFT';
    }

    /**
     * Get generated code
     */
    getCode(): string {
        return this.code.join("\n");
    }

    /**
     * Clear the code buffer
     */
    clear() {
        this.code = [];
        this.indent = 0;
    }
}

/**
 * Generate a complete screen creation function
 */
export function generateScreenFunction(
    page: any,
    functionName: string = "create_screen"
): string {
    const generator = new LVGLCodeGenerator();
    
    const lines: string[] = [];
    
    lines.push(`void ${functionName}(lv_obj_t * parent) {`);
    lines.push(`    lv_obj_clean(parent);`);
    lines.push(`    lv_obj_set_size(parent, LV_PCT(100), LV_PCT(100));`);
    lines.push(``);
    
    // Add global variable declarations
    const globalVars = new Set<string>();
    function collectVars(widget: any) {
        if (widget.identifier) {
            globalVars.add(widget.identifier);
        }
        if (widget.children) {
            widget.children.forEach(collectVars);
        }
    }
    
    if (page.widgets) {
        page.widgets.forEach(collectVars);
    }
    
    // Generate widgets
    if (page.widgets) {
        for (const widget of page.widgets) {
            const widgetCode = generator.generateWidget(widget, "parent");
            const indentedCode = widgetCode.split('\n').map(line => '    ' + line).join('\n');
            lines.push(indentedCode);
        }
    }
    
    lines.push(`}`);
    lines.push(``);
    
    return lines.join('\n');
}

/**
 * Export an EEZ Studio project back to Arduino files
 */
export async function exportToArduino(
    project: any,
    outputPath: string,
    options?: CodeGenerationOptions
): Promise<{ success: boolean; files?: GeneratedCode[]; error?: string }> {
    try {
        const files: GeneratedCode[] = [];

        // Generate header file with global declarations
        const headerLines: string[] = [];
        headerLines.push(`#pragma once`);
        headerLines.push(`#include "lvgl/lvgl.h"`);
        headerLines.push(``);
        headerLines.push(`// Global widget variables`);
        
        // Collect all identifiers
        const allIdentifiers = new Set<string>();
        if (project.pages) {
            for (const page of project.pages) {
                function collectIdentifiers(widget: any) {
                    if (widget.identifier) {
                        allIdentifiers.add(widget.identifier);
                    }
                    if (widget.children) {
                        widget.children.forEach(collectIdentifiers);
                    }
                }
                if (page.widgets) {
                    page.widgets.forEach(collectIdentifiers);
                }
            }
        }

        for (const identifier of allIdentifiers) {
            headerLines.push(`extern lv_obj_t * ${identifier};`);
        }
        headerLines.push(``);

        // Add function declarations
        if (project.pages) {
            for (const page of project.pages) {
                const functionName = `${page.name}_create`;
                headerLines.push(`void ${functionName}(lv_obj_t * parent);`);
            }
        }

        files.push({
            fileName: "ui.h",
            code: headerLines.join('\n')
        });

        // Generate implementation files for each page
        if (project.pages) {
            for (const page of project.pages) {
                const implLines: string[] = [];
                implLines.push(`#include "ui.h"`);
                implLines.push(``);

                // Define global variables
                function collectIdentifiers(widget: any) {
                    if (widget.identifier) {
                        implLines.push(`lv_obj_t * ${widget.identifier} = NULL;`);
                    }
                    if (widget.children) {
                        widget.children.forEach(collectIdentifiers);
                    }
                }
                if (page.widgets) {
                    page.widgets.forEach(collectIdentifiers);
                }
                implLines.push(``);

                // Generate screen creation function
                const functionName = `${page.name}_create`;
                const screenCode = generateScreenFunction(page, functionName);
                implLines.push(screenCode);

                files.push({
                    fileName: `${page.name}.cpp`,
                    code: implLines.join('\n')
                });
            }
        }

        // Write files to disk
        for (const file of files) {
            const filePath = path.join(outputPath, file.fileName);
            fs.writeFileSync(filePath, file.code, 'utf-8');
        }

        return {
            success: true,
            files
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
