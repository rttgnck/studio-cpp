# Arduino LVGL Low-Code GUI Builder

This feature adds support for importing and editing Arduino-based LVGL projects in EEZ Studio, providing a visual low-code interface for LVGL GUI development.

## Overview

The Arduino LVGL Low-Code GUI Builder allows you to:
1. **Import** existing Arduino projects with LVGL UI code into EEZ Studio
2. **Edit** the UI visually using drag-and-drop widgets and property panels
3. **Export** the modified project back to Arduino C++ code

This eliminates the need to manually write and maintain LVGL widget creation code, styles, and layouts.

## Features

### Import Arduino LVGL Projects
- Scans Arduino project folders for LVGL code
- Parses C++/INO files to extract widget hierarchies
- Converts LVGL widgets to EEZ Studio format
- Supports common LVGL widgets:
  - Containers (lv_obj)
  - Labels (lv_label)
  - Buttons (lv_btn)
  - Arcs (lv_arc)
  - Sliders, Bars, Checkboxes, Switches
  - And more...

### Visual Editor
- Drag-and-drop widget positioning
- Property editing through intuitive panels
- Real-time preview of changes
- Style customization (colors, fonts, borders, etc.)
- Widget alignment and sizing tools

### Export to Arduino
- Generates clean C++ code from visual design
- Creates header file (ui.h) with declarations
- Creates implementation files for each screen
- Preserves widget identifiers and hierarchies
- Easy integration with existing Arduino sketches

## Usage

### Importing an Arduino Project

1. **Open EEZ Studio**

2. **Select Import from Menu**
   - Go to `File` → `Import Arduino LVGL Project...`
   - Browse to your Arduino project folder

3. **Scan Project**
   - The importer will automatically scan for LVGL code
   - It shows how many files and LVGL widgets were found

4. **Import and Save**
   - Click "Import" to convert the project
   - Choose where to save the `.eez-project` file
   - The project will open automatically

### Editing Your GUI

Once imported, you can use all of EEZ Studio's visual editing features:

- **Widget Tree**: View and navigate your widget hierarchy
- **Canvas**: Drag and position widgets visually
- **Properties Panel**: Edit widget properties, text, colors, sizes
- **Styles**: Create and apply custom styles
- **Preview**: See changes in real-time

### Exporting Back to Arduino

1. **Open Your Project**
   - Make sure you have the modified project open

2. **Select Export from Menu**
   - Go to `File` → `Export to Arduino Project...`
   - Choose an output directory

3. **Generate Code**
   - Click "Export" to generate the C++ files
   - The following files will be created:
     - `ui.h` - Header with all declarations
     - `<screen_name>.cpp` - Implementation for each screen

4. **Use in Your Arduino Sketch**
   ```cpp
   #include "ui.h"
   
   void setup() {
       // Initialize LVGL...
       
       // Create your screen
       main_screen_create(lv_scr_act());
   }
   
   void loop() {
       lv_task_handler();
   }
   ```

## Example: FilaGauge Scale

Here's how to use this with the FilaGauge project mentioned in the problem statement:

### Import
1. Open EEZ Studio
2. `File` → `Import Arduino LVGL Project...`
3. Select the FilaGauge project folder
4. Import and save as `filagauge.eez-project`

### Edit
- Modify the scale display layout
- Change colors and fonts visually
- Adjust button positions
- Add new widgets without writing code

### Export
1. `File` → `Export to Arduino Project...`
2. Select output folder
3. Include the generated files in your Arduino project:
   ```cpp
   #include "ui.h"
   
   void main_screen_create(lv_obj_t * parent) {
       // Generated code handles all widget creation
   }
   ```

## Supported LVGL Features

### Widgets
- ✅ Basic containers (lv_obj)
- ✅ Labels with text and fonts
- ✅ Buttons
- ✅ Arcs (progress indicators)
- ✅ Sliders and bars
- ✅ Images
- ✅ Checkboxes and switches
- ✅ Dropdowns and rollers
- ✅ Charts and meters

### Properties
- ✅ Position (x, y) and alignment
- ✅ Size (width, height, percentages)
- ✅ Text content
- ✅ Value and range (for sliders, arcs, etc.)
- ✅ Colors (background, text, borders)
- ✅ Fonts
- ✅ Border radius and opacity
- ✅ Shadows

### Styles
- ✅ Local styles per widget
- ✅ Background colors and opacity
- ✅ Text colors and fonts
- ✅ Border styles
- ✅ Padding and radius

## Limitations

- Event handlers must be implemented separately in your Arduino code
- Complex LVGL features (animations, custom draw callbacks) need manual coding
- The parser handles common LVGL patterns but may not support all edge cases
- Generated code is clean and readable but won't preserve custom C++ formatting

## Best Practices

1. **Keep UI and Logic Separate**
   - Use the visual editor for UI layout and appearance
   - Implement business logic and event handlers in separate files

2. **Use Meaningful Identifiers**
   - Give widgets clear names in the editor
   - These become variable names in generated code

3. **Test After Import**
   - Always verify the imported project looks correct
   - Some complex layouts may need manual adjustment

4. **Version Control**
   - Keep both the `.eez-project` file and generated C++ code in version control
   - This allows tracking both visual design and code changes

## Troubleshooting

### Import Issues

**Problem**: "No LVGL code found in the project"
- **Solution**: Make sure your files contain `lv_obj`, `lv_label_create`, etc.

**Problem**: Widgets not recognized
- **Solution**: Check that widget creation follows standard LVGL patterns

### Export Issues

**Problem**: Generated code doesn't compile
- **Solution**: Verify all required LVGL headers are included in your project

**Problem**: Widgets look different
- **Solution**: Check that fonts and colors are available in your target platform

## Technical Details

### Architecture

The Arduino LVGL Low-Code GUI Builder consists of:

1. **C++ Parser** (`cpp-parser.ts`)
   - Tokenizes and parses C++ files
   - Extracts LVGL widget creation patterns
   - Builds abstract syntax tree of UI hierarchy

2. **Project Importer** (`arduino-importer.ts`)
   - Scans project directories
   - Converts parsed widgets to EEZ Studio format
   - Creates compatible project structure

3. **Code Generator** (`arduino-exporter.ts`)
   - Converts EEZ Studio widgets to LVGL C++ code
   - Generates proper header and implementation files
   - Preserves widget relationships and properties

4. **UI Components** (`arduino-import-dialog.tsx`, `arduino-export-dialog.tsx`)
   - User-friendly import/export wizards
   - Progress feedback and error handling

### File Formats

**Input**: Arduino C++ files (`.cpp`, `.ino`, `.h`)
- Standard LVGL widget creation code
- Style and property setter functions

**Internal**: EEZ Studio LVGL Project (`.eez-project`)
- JSON-based project structure
- Compatible with existing EEZ Studio features

**Output**: Generated C++ files
- `ui.h` - Declarations for all widgets and functions
- `*.cpp` - Implementation files for each screen

## Contributing

To extend this feature:

1. **Add Widget Support**: Update `cpp-parser.ts` and `arduino-importer.ts`
2. **Improve Parsing**: Enhance pattern matching in parser
3. **Add Export Options**: Extend `arduino-exporter.ts` with more generation options

## License

This feature is part of EEZ Studio and follows the same GPL v3 license.
