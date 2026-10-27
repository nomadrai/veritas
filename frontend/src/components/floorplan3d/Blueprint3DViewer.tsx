"use client";

import React, { useState } from "react";
import { Box, RotateCcw, Layers, CheckCircle2, AlertTriangle } from "lucide-react";

export interface Room3DSpec {
  room_id: string;
  name: string;
  facility_type: string;
  x_m: number;
  z_m: number;
  width_m: number;
  depth_m: number;
  measured_area_sqm: number;
  aph_required_sqm: number;
  status: string;
  color_hex: string;
}

interface Blueprint3DViewerProps {
  rooms?: Room3DSpec[];
}

const DEFAULT_ROOMS: Room3DSpec[] = [
  {
    room_id: "CR-101",
    name: "Classroom CR-101 (CSE Div-A)",
    facility_type: "UG Classroom",
    x_m: 0,
    z_m: 0,
    width_m: 11.0,
    depth_m: 6.05,
    measured_area_sqm: 66.55,
    aph_required_sqm: 66.0,
    status: "COMPLIANT",
    color_hex: "#0F766E",
  },
  {
    room_id: "CR-102",
    name: "Classroom CR-102 (AI & ML Div-B)",
    facility_type: "UG Classroom",
    x_m: 11.5,
    z_m: 0,
    width_m: 8.0,
    depth_m: 6.0,
    measured_area_sqm: 48.0,
    aph_required_sqm: 66.0,
    status: "DEFICIENT (-18.0 m²)",
    color_hex: "#B91C1C",
  },
  {
    room_id: "CC-201",
    name: "Central Computer Center CC-201",
    facility_type: "Computer Center",
    x_m: 0,
    z_m: 6.6,
    width_m: 14.0,
    depth_m: 11.0,
    measured_area_sqm: 154.0,
    aph_required_sqm: 150.0,
    status: "COMPLIANT",
    color_hex: "#1D4ED8",
  },
  {
    room_id: "RAMP-01",
    name: "Barrier-Free Ramp (1:12 Slope)",
    facility_type: "Accessibility Core",
    x_m: 14.5,
    z_m: 6.6,
    width_m: 5.0,
    depth_m: 11.0,
    measured_area_sqm: 55.0,
    aph_required_sqm: 45.0,
    status: "COMPLIANT",
    color_hex: "#0F766E",
  },
];

/**
 * Phase 1.5 Scaffold: Interactive 2D-to-3D Blueprint Extrusion & APH Room Norm Inspector
 */
export function Blueprint3DViewer({ rooms = DEFAULT_ROOMS }: Blueprint3DViewerProps) {
  const [pitch, setPitch] = useState<number>(52);
  const [yaw, setYaw] = useState<number>(-28);
  const [wallHeight, setWallHeight] = useState<number>(36);
  const [selectedRoom, setSelectedRoom] = useState<Room3DSpec>(rooms[1]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-[#1D4ED8]" />
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Interactive 2D-to-3D Blueprint Room Norm Extruder (Phase 1.5 Module)
            </h3>
            <p className="text-xs text-[#64748B]">
              Extrudes architect floor plan rooms into 3D to visually compare measured carpet area against AICTE APH 2024–27 minimums.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-[#334155]">
            <span>Orbit Yaw:</span>
            <input
              type="range"
              min={-65}
              max={65}
              value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
              className="h-1.5 w-20 accent-[#1E3A8A]"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[#334155]">
            <span>Wall Extrusion:</span>
            <input
              type="range"
              min={12}
              max={64}
              value={wallHeight}
              onChange={(e) => setWallHeight(Number(e.target.value))}
              className="h-1.5 w-20 accent-[#1E3A8A]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPitch(52);
              setYaw(-28);
              setWallHeight(36);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155] hover:bg-white"
          >
            <RotateCcw className="h-3 w-3" />
            Reset 3D View
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div
          className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-lg border border-[#CBD5E1] bg-[#F1F5F9] p-6 lg:col-span-8"
          style={{ perspective: "900px" }}
        >
          <div
            style={{
              width: "390px",
              height: "352px",
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateX(${pitch}deg) rotateZ(${yaw}deg)`,
              transition: "transform 120ms ease-out",
            }}
          >
            {rooms.map((r) => {
              const isDeficient = r.measured_area_sqm < r.aph_required_sqm;
              const isActive = selectedRoom.room_id === r.room_id;
              return (
                <div
                  key={r.room_id}
                  onClick={() => setSelectedRoom(r)}
                  style={{
                    position: "absolute",
                    left: `${r.x_m * 19}px`,
                    top: `${r.z_m * 19}px`,
                    width: `${r.width_m * 19}px`,
                    height: `${r.depth_m * 19}px`,
                    transform: `translateZ(${wallHeight}px)`,
                    border: isActive ? "3px solid #0F172A" : "2px solid #FFFFFF",
                    backgroundColor: isDeficient
                      ? "rgba(185, 28, 28, 0.85)"
                      : "rgba(15, 118, 110, 0.82)",
                    boxShadow: `0 ${wallHeight}px 0 rgba(15, 23, 42, 0.28)`,
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center p-2 text-center text-white transition-all"
                >
                  <span className="font-mono text-xs font-bold">{r.room_id}</span>
                  <span className="mt-0.5 font-mono text-[11px] font-semibold">
                    {r.measured_area_sqm} m²
                  </span>
                  <span className="mt-0.5 text-[10px] opacity-90">
                    (Norm: {r.aph_required_sqm} m²)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="font-mono text-xs font-bold text-[#1E3A8A]">
                SELECTED 3D ROOM · {selectedRoom.room_id}
              </span>
              {selectedRoom.measured_area_sqm < selectedRoom.aph_required_sqm ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                  <AlertTriangle className="h-3 w-3" />
                  Shortfall
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                  <CheckCircle2 className="h-3 w-3" />
                  Compliant
                </span>
              )}
            </div>
            <h4 className="mt-2.5 text-sm font-bold text-[#0F172A]">{selectedRoom.name}</h4>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Dimensions:</dt>
                <dd className="font-mono font-semibold text-[#0F172A]">
                  {selectedRoom.width_m}m × {selectedRoom.depth_m}m
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">Measured Carpet Area:</dt>
                <dd className="font-mono font-bold text-[#0F172A]">
                  {selectedRoom.measured_area_sqm} sq.m
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748B]">AICTE APH 2024–27 Norm:</dt>
                <dd className="font-mono font-semibold text-[#1D4ED8]">
                  &ge; {selectedRoom.aph_required_sqm} sq.m
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-md border border-[#CBD5E1] bg-white p-2.5 text-[11px] text-[#475569]">
            <Layers className="mr-1 inline h-3.5 w-3.5 text-[#1D4ED8]" />
            Click any extruded room block in the 3D model to inspect its carpet-area compliance.
          </div>
        </div>
      </div>
    </div>
  );
}
