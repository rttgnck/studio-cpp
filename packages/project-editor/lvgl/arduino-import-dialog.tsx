/**
 * Arduino LVGL Project Import Dialog
 * 
 * UI for importing Arduino projects with LVGL code into EEZ Studio
 */

import React from "react";
import { observable, runInAction, makeObservable, action } from "mobx";
import { observer } from "mobx-react";
import { dialog, getCurrentWindow } from "@electron/remote";
import fs from "fs";
import path from "path";

import { showGenericDialog } from "eez-studio-ui/generic-dialog";
import * as notification from "eez-studio-ui/notification";

import { importArduinoLVGLProject, scanArduinoProject } from "./arduino-importer";
import { openProject } from "home/tabs-store";

interface ArduinoImportState {
    projectPath: string;
    scanning: boolean;
    importing: boolean;
    filesFound: number;
    lvglFilesFound: number;
    error: string | null;
    scanComplete: boolean;
}

class ArduinoImportDialogStore {
    state: ArduinoImportState = {
        projectPath: "",
        scanning: false,
        importing: false,
        filesFound: 0,
        lvglFilesFound: 0,
        error: null,
        scanComplete: false
    };

    constructor() {
        makeObservable(this, {
            state: observable,
            scanProject: action,
            importProject: action
        });
    }

    async scanProject(projectPath: string) {
        runInAction(() => {
            this.state.projectPath = projectPath;
            this.state.scanning = true;
            this.state.error = null;
        });

        try {
            const projectInfo = scanArduinoProject(projectPath);

            runInAction(() => {
                this.state.filesFound = projectInfo.files.length;
                this.state.lvglFilesFound = projectInfo.mainFiles.length;
                this.state.scanComplete = true;
                this.state.scanning = false;

                if (!projectInfo.hasLVGL) {
                    this.state.error = "No LVGL code found in the project. Make sure the project contains files with LVGL widget creation code (lv_obj_create, lv_label_create, etc.)";
                }
            });
        } catch (error) {
            runInAction(() => {
                this.state.error = error instanceof Error ? error.message : String(error);
                this.state.scanning = false;
            });
        }
    }

    async importProject(): Promise<string | null> {
        runInAction(() => {
            this.state.importing = true;
            this.state.error = null;
        });

        try {
            const result = await importArduinoLVGLProject(this.state.projectPath);

            if (!result.success) {
                runInAction(() => {
                    this.state.error = result.error || "Unknown error";
                    this.state.importing = false;
                });
                return null;
            }

            // Save the project to a temporary location
            const projectName = path.basename(this.state.projectPath);
            const saveResult = await dialog.showSaveDialog(getCurrentWindow(), {
                defaultPath: `${projectName}.eez-project`,
                filters: [
                    { name: "EEZ Project", extensions: ["eez-project"] }
                ]
            });

            if (saveResult.canceled || !saveResult.filePath) {
                runInAction(() => {
                    this.state.importing = false;
                });
                return null;
            }

            const projectFilePath = saveResult.filePath;

            // Write the project file
            fs.writeFileSync(
                projectFilePath,
                JSON.stringify(result.project, null, 2),
                "utf-8"
            );

            runInAction(() => {
                this.state.importing = false;
            });

            return projectFilePath;
        } catch (error) {
            runInAction(() => {
                this.state.error = error instanceof Error ? error.message : String(error);
                this.state.importing = false;
            });
            return null;
        }
    }
}

const ArduinoImportDialogComponent = observer(
    ({ store, onClose }: { store: ArduinoImportDialogStore; onClose: () => void }) => {
        const { state } = store;

        return (
            <div className="arduino-import-dialog">
                <div className="mb-3">
                    <h5>Import Arduino LVGL Project</h5>
                    <p className="text-muted">
                        This wizard will scan your Arduino project for LVGL UI code
                        and create an EEZ Studio project that you can edit visually.
                    </p>
                </div>

                <div className="mb-3">
                    <label className="form-label">Project Path:</label>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            value={state.projectPath}
                            readOnly
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                const result = await dialog.showOpenDialog(getCurrentWindow(), {
                                    properties: ["openDirectory"]
                                });
                                if (result.filePaths && result.filePaths[0]) {
                                    store.scanProject(result.filePaths[0]);
                                }
                            }}
                            disabled={state.scanning || state.importing}
                        >
                            Browse...
                        </button>
                    </div>
                </div>

                {state.scanning && (
                    <div className="alert alert-info">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        Scanning project...
                    </div>
                )}

                {state.scanComplete && !state.error && (
                    <div className="alert alert-success">
                        <strong>Project scanned successfully!</strong>
                        <ul className="mb-0 mt-2">
                            <li>{state.filesFound} C++ files found</li>
                            <li>{state.lvglFilesFound} files with LVGL code</li>
                        </ul>
                    </div>
                )}

                {state.error && (
                    <div className="alert alert-danger">
                        <strong>Error:</strong> {state.error}
                    </div>
                )}

                {state.importing && (
                    <div className="alert alert-info">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        Importing project...
                    </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={state.importing}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={async () => {
                            const projectPath = await store.importProject();
                            if (projectPath) {
                                notification.success("Arduino project imported successfully!");
                                onClose();
                                // Open the newly created project
                                setTimeout(() => {
                                    openProject(projectPath, false);
                                }, 100);
                            }
                        }}
                        disabled={
                            !state.scanComplete ||
                            !!state.error ||
                            state.importing ||
                            state.lvglFilesFound === 0
                        }
                    >
                        Import
                    </button>
                </div>
            </div>
        );
    }
);

export function showArduinoImportDialog(initialPath?: string) {
    const store = new ArduinoImportDialogStore();

    if (initialPath) {
        store.scanProject(initialPath);
    }

    showGenericDialog({
        dialogDefinition: {
            title: "Import Arduino LVGL Project",
            size: "medium",
            fields: []
        },
        values: {},
        opts: {
            jsPanel: {
                width: 600,
                height: 500
            }
        }
    }).then(() => {
        // Dialog closed
    }).catch(() => {
        // Dialog canceled
    });

    // Override the dialog content with our custom component
    setTimeout(async () => {
        const dialogElement = document.querySelector(".modal-body");
        if (dialogElement) {
            const { createRoot } = await import("react-dom/client");
            const root = createRoot(dialogElement);
            root.render(
                <ArduinoImportDialogComponent
                    store={store}
                    onClose={() => {
                        const closeButton = document.querySelector(".modal button.btn-close") as HTMLButtonElement;
                        if (closeButton) {
                            closeButton.click();
                        }
                    }}
                />
            );
        }
    }, 100);
}
