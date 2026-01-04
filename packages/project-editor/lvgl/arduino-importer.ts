/**
 * Arduino LVGL Project Importer
 * 
 * This module handles importing Arduino projects with LVGL UI code
 * into EEZ Studio projects.
 */

import fs from "fs";
import path from "path";
import { parseArduinoLVGLProject, LVGLWidget, ParsedLVGLFile } from "./cpp-parser";
import { Project, ProjectType } from "project-editor/project/project";
import { ProjectStore, createObject } from "project-editor/store";
import { Page } from "project-editor/features/page/page";

export interface ArduinoProjectInfo {
    projectPath: string;
    files: string[];
    mainFiles: string[];
    hasLVGL: boolean;
}

/**
 * Scan a directory for Arduino project files
 */
export function scanArduinoProject(projectPath: string): ArduinoProjectInfo {
    const files: string[] = [];
    const mainFiles: string[] = [];
    let hasLVGL = false;

    function scanDir(dir: string) {
        try {
            const entries = fs.readdirSync(dir);
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Skip common directories
                    if (!['node_modules', '.git', 'build', 'dist'].includes(entry)) {
                        scanDir(fullPath);
                    }
                } else if (stat.isFile()) {
                    const ext = path.extname(entry).toLowerCase();
                    if (['.cpp', '.c', '.ino', '.h', '.hpp'].includes(ext)) {
                        files.push(fullPath);
                        
                        // Check if file contains LVGL code
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        if (content.includes('lv_obj') || content.includes('lvgl')) {
                            hasLVGL = true;
                            if (ext === '.cpp' || ext === '.ino') {
                                mainFiles.push(fullPath);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dir}:`, error);
        }
    }

    scanDir(projectPath);

    return {
        projectPath,
        files,
        mainFiles,
        hasLVGL
    };
}

/**
 * Map LVGL widget type to EEZ Studio widget type
 */
function mapWidgetType(lvglType: string): string {
    const mapping: { [key: string]: string } = {
        'lv_obj': 'LVGLContainerWidget',
        'lv_label': 'LVGLLabelWidget',
        'lv_btn': 'LVGLButtonWidget',
        'lv_arc': 'LVGLArcWidget',
        'lv_slider': 'LVGLSliderWidget',
        'lv_bar': 'LVGLBarWidget',
        'lv_checkbox': 'LVGLCheckboxWidget',
        'lv_switch': 'LVGLSwitchWidget',
        'lv_dropdown': 'LVGLDropdownWidget',
        'lv_img': 'LVGLImageWidget',
        'lv_textarea': 'LVGLTextareaWidget',
        'lv_keyboard': 'LVGLKeyboardWidget',
        'lv_chart': 'LVGLChartWidget',
        'lv_table': 'LVGLTableWidget',
        'lv_spinner': 'LVGLSpinnerWidget',
        'lv_roller': 'LVGLRollerWidget',
        'lv_meter': 'LVGLMeterWidget'
    };

    return mapping[lvglType] || 'LVGLContainerWidget';
}

/**
 * Convert parsed LVGL widget to EEZ Studio widget structure
 */
function convertWidget(widget: LVGLWidget, projectStore: ProjectStore, parent: any): any {
    const eezWidgetType = mapWidgetType(widget.type);
    
    // Create basic widget structure
    const eezWidget: any = {
        type: eezWidgetType,
        identifier: widget.variableName,
        left: widget.position.x,
        top: widget.position.y,
        width: typeof widget.size.width === 'string' ? widget.size.width : widget.size.width,
        height: typeof widget.size.height === 'string' ? widget.size.height : widget.size.height,
        children: []
    };

    // Add text property if it exists
    if (widget.properties.has("text")) {
        eezWidget.text = widget.properties.get("text");
    }

    // Add alignment
    if (widget.properties.has("align")) {
        eezWidget.align = widget.properties.get("align");
    }

    // Add value properties
    if (widget.properties.has("value")) {
        eezWidget.value = widget.properties.get("value");
    }
    if (widget.properties.has("range_min")) {
        eezWidget.min = widget.properties.get("range_min");
    }
    if (widget.properties.has("range_max")) {
        eezWidget.max = widget.properties.get("range_max");
    }

    // Convert styles
    const localStyles: any = {};
    
    if (widget.styles.has("bg_color")) {
        localStyles.backgroundColor = widget.styles.get("bg_color");
    }
    if (widget.styles.has("text_color")) {
        localStyles.color = widget.styles.get("text_color");
    }
    if (widget.styles.has("text_font")) {
        localStyles.font = widget.styles.get("text_font");
    }
    if (widget.styles.has("radius")) {
        localStyles.borderRadius = widget.styles.get("radius");
    }

    if (Object.keys(localStyles).length > 0) {
        eezWidget.localStyles = localStyles;
    }

    // Process children recursively
    for (const child of widget.children) {
        const childWidget = convertWidget(child, projectStore, eezWidget);
        eezWidget.children.push(childWidget);
    }

    return eezWidget;
}

/**
 * Create an EEZ Studio project from parsed Arduino LVGL files
 */
export function createProjectFromArduino(
    projectPath: string,
    parsedFiles: ParsedLVGLFile[],
    projectStore: ProjectStore
): any {
    const projectName = path.basename(projectPath);

    // Create basic project structure
    const projectJson: any = {
        settings: {
            general: {
                projectVersion: "v3",
                projectType: "lvgl",
                lvglVersion: "8.3",
                imports: []
            },
            build: {
                configurations: [
                    {
                        name: "Default",
                        screenOrientation: "landscape"
                    }
                ],
                files: []
            }
        },
        variables: {
            globalVariables: []
        },
        actions: [],
        pages: [],
        styles: [],
        fonts: [],
        bitmaps: [],
        colors: [],
        themes: []
    };

    // Create pages from parsed files
    for (const parsedFile of parsedFiles) {
        const pageName = path.basename(parsedFile.fileName, path.extname(parsedFile.fileName));
        
        const page: any = {
            name: pageName,
            description: `Imported from ${parsedFile.fileName}`,
            width: 320,
            height: 240,
            widgets: []
        };

        // Convert top-level widgets
        for (const widget of parsedFile.widgets) {
            if (!widget.parent || widget.parent === "parent") {
                const eezWidget = convertWidget(widget, projectStore, page);
                page.widgets.push(eezWidget);
            }
        }

        projectJson.pages.push(page);
    }

    // Add metadata about original source
    projectJson._arduinoImport = {
        sourcePath: projectPath,
        importDate: new Date().toISOString(),
        sourceFiles: parsedFiles.map(f => f.fileName)
    };

    return projectJson;
}

/**
 * Import an Arduino LVGL project
 */
export async function importArduinoLVGLProject(
    projectPath: string
): Promise<{ success: boolean; project?: any; error?: string }> {
    try {
        // Scan project
        const projectInfo = scanArduinoProject(projectPath);
        
        if (!projectInfo.hasLVGL) {
            return {
                success: false,
                error: "No LVGL code found in the project"
            };
        }

        // Read and parse files
        const filesToParse = projectInfo.mainFiles.length > 0 
            ? projectInfo.mainFiles 
            : projectInfo.files;

        const fileContents = filesToParse.map(filePath => ({
            fileName: filePath,
            content: fs.readFileSync(filePath, 'utf-8')
        }));

        const parsedFiles = parseArduinoLVGLProject(fileContents);

        if (parsedFiles.length === 0) {
            return {
                success: false,
                error: "Could not parse any LVGL widgets from the files"
            };
        }

        // Create a temporary project store for conversion
        // This will be integrated properly when loaded into EEZ Studio
        const projectJson = createProjectFromArduino(
            projectPath,
            parsedFiles,
            null as any // Will be provided by EEZ Studio when actually loading
        );

        return {
            success: true,
            project: projectJson
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
