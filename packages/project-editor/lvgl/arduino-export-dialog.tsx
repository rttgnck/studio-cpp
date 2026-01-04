/**
 * Arduino Export Dialog
 * 
 * UI for exporting EEZ Studio LVGL projects back to Arduino C++ code
 */

import React from "react";
import { observable, runInAction, makeObservable, action } from "mobx";
import { observer } from "mobx-react";
import { dialog, getCurrentWindow } from "@electron/remote";
import fs from "fs";
import path from "path";

import { showGenericDialog } from "eez-studio-ui/generic-dialog";
import * as notification from "eez-studio-ui/notification";

import { exportToArduino } from "./arduino-exporter";
import { ProjectStore } from "project-editor/store";
import { objectToJson } from "project-editor/store/serialization";

interface ExportState {
    outputPath: string;
    exporting: boolean;
    error: string | null;
    filesGenerated: number;
    success: boolean;
}

class ArduinoExportDialogStore {
    state: ExportState = {
        outputPath: "",
        exporting: false,
        error: null,
        filesGenerated: 0,
        success: false
    };

    constructor(private projectStore: ProjectStore) {
        makeObservable(this, {
            state: observable,
            exportProject: action
        });
    }

    async exportProject(): Promise<boolean> {
        runInAction(() => {
            this.state.exporting = true;
            this.state.error = null;
            this.state.success = false;
        });

        try {
            // Get project as JSON
            const projectJson = JSON.parse(
                objectToJson(this.projectStore.project)
            );

            // Export to Arduino
            const result = await exportToArduino(
                projectJson,
                this.state.outputPath
            );

            if (!result.success) {
                runInAction(() => {
                    this.state.error = result.error || "Unknown error";
                    this.state.exporting = false;
                });
                return false;
            }

            runInAction(() => {
                this.state.filesGenerated = result.files?.length || 0;
                this.state.success = true;
                this.state.exporting = false;
            });

            return true;
        } catch (error) {
            runInAction(() => {
                this.state.error = error instanceof Error ? error.message : String(error);
                this.state.exporting = false;
            });
            return false;
        }
    }
}

const ArduinoExportDialogComponent = observer(
    ({ store, onClose }: { store: ArduinoExportDialogStore; onClose: () => void }) => {
        const { state } = store;

        return (
            <div className="arduino-export-dialog">
                <div className="mb-3">
                    <h5>Export to Arduino Project</h5>
                    <p className="text-muted">
                        This will generate Arduino C++ code from your LVGL project
                        that can be directly included in your Arduino sketch.
                    </p>
                </div>

                <div className="mb-3">
                    <label className="form-label">Output Directory:</label>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control"
                            value={state.outputPath}
                            readOnly
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                const result = await dialog.showOpenDialog(getCurrentWindow(), {
                                    properties: ["openDirectory", "createDirectory"]
                                });
                                if (result.filePaths && result.filePaths[0]) {
                                    runInAction(() => {
                                        store.state.outputPath = result.filePaths[0];
                                    });
                                }
                            }}
                            disabled={state.exporting}
                        >
                            Browse...
                        </button>
                    </div>
                    <small className="form-text text-muted">
                        Generated files will be saved to this directory
                    </small>
                </div>

                {state.exporting && (
                    <div className="alert alert-info">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        Generating Arduino code...
                    </div>
                )}

                {state.success && (
                    <div className="alert alert-success">
                        <strong>Export successful!</strong>
                        <p className="mb-0 mt-2">
                            Generated {state.filesGenerated} files:
                        </p>
                        <ul className="mb-0 mt-1">
                            <li>ui.h - Header file with declarations</li>
                            <li>*.cpp - Implementation files for each screen</li>
                        </ul>
                        <p className="mt-2 mb-0">
                            <strong>Usage:</strong> Include "ui.h" in your Arduino sketch
                            and call the screen creation functions (e.g., main_screen_create(parent)).
                        </p>
                    </div>
                )}

                {state.error && (
                    <div className="alert alert-danger">
                        <strong>Error:</strong> {state.error}
                    </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={state.exporting}
                    >
                        {state.success ? "Close" : "Cancel"}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={async () => {
                            const success = await store.exportProject();
                            if (success) {
                                notification.success("Arduino code exported successfully!");
                                setTimeout(() => {
                                    onClose();
                                }, 3000);
                            }
                        }}
                        disabled={
                            !state.outputPath ||
                            state.exporting ||
                            state.success
                        }
                    >
                        Export
                    </button>
                </div>
            </div>
        );
    }
);

export function showArduinoExportDialog(projectStore: ProjectStore) {
    const store = new ArduinoExportDialogStore(projectStore);

    showGenericDialog({
        dialogDefinition: {
            title: "Export to Arduino Project",
            size: "medium",
            fields: []
        },
        values: {},
        opts: {
            jsPanel: {
                width: 600,
                height: 450
            }
        }
    }).then(() => {
        // Dialog closed
    }).catch(() => {
        // Dialog canceled
    });

    // Override the dialog content with our custom component
    setTimeout(() => {
        const dialogElement = document.querySelector(".modal-body");
        if (dialogElement) {
            const root = require("react-dom/client").createRoot(dialogElement);
            root.render(
                <ArduinoExportDialogComponent
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
