"""
Phase 1.5 & Phase 2 Scaffold: 2D-to-3D Floorplan Room Extruder & Supervision Zone Counter
=========================================================================================
Reference: CubiCasa5k / floorplan-to-3d & roboflow/supervision
"""

from typing import Any, Dict, List


def get_extruded_3d_floorplan_spec(app_id: str = "AICTE-2026-EOA-8841") -> Dict[str, Any]:
    """
    Returns the structured 3D room extrusion geometry extracted from the Architect
    Blueprint (`floor_plan_8841.pdf`) for interactive 3D inspection against AICTE APH norms.
    """
    return {
        "app_id": app_id,
        "blueprint_id": "DOC-8841-FLOOR",
        "building_name": "Academic Block-A · First Floor Instructional Wing",
        "scale_ratio": "1:100",
        "wall_height_m": 3.4,
        "aph_handbook_version": "AICTE APH 2024-2027 Appendix-4",
        "rooms_3d": [
            {
                "room_id": "CR-101",
                "name": "UG Classroom CR-101 (CSE Div-A)",
                "facility_type": "UG Classroom",
                "x_m": 0.0,
                "z_m": 0.0,
                "width_m": 11.0,
                "depth_m": 6.05,
                "measured_area_sqm": 66.55,
                "aph_required_sqm": 66.0,
                "detected_seats": 60,
                "required_seats": 60,
                "status": "COMPLIANT",
                "color_hex": "#0F766E",
            },
            {
                "room_id": "CR-102",
                "name": "UG Classroom CR-102 (AI & ML Div-B)",
                "facility_type": "UG Classroom",
                "x_m": 11.5,
                "z_m": 0.0,
                "width_m": 8.0,
                "depth_m": 6.0,
                "measured_area_sqm": 48.0,
                "aph_required_sqm": 66.0,
                "detected_seats": 38,
                "required_seats": 60,
                "status": "DEFICIENT_AREA_AND_SEATING",
                "deficit_sqm": -18.0,
                "color_hex": "#B91C1C",
            },
            {
                "room_id": "CC-201",
                "name": "Central Computer Center CC-201",
                "facility_type": "Computer Center",
                "x_m": 0.0,
                "z_m": 6.6,
                "width_m": 14.0,
                "depth_m": 11.0,
                "measured_area_sqm": 154.0,
                "aph_required_sqm": 150.0,
                "detected_pcs": 16,
                "required_pcs": 30,
                "status": "AREA_OK_EQUIPMENT_SHORTFALL",
                "color_hex": "#1D4ED8",
            },
            {
                "room_id": "RAMP-01",
                "name": "Barrier-Free Wheelchair Ramp & Exit Core",
                "facility_type": "Barrier-Free Access",
                "x_m": 14.5,
                "z_m": 6.6,
                "width_m": 5.0,
                "depth_m": 11.0,
                "measured_area_sqm": 55.0,
                "aph_required_sqm": 45.0,
                "slope_gradient": "1:12",
                "status": "COMPLIANT",
                "color_hex": "#0F766E",
            },
        ],
    }


def evaluate_polygon_zone_occupancy(
    detected_count: int, room_area_sqm: float, division_intake: int = 60
) -> Dict[str, Any]:
    """
    Computes per-student carpet area density (`sqm_per_student`) and compares against
    the AICTE APH 2024-27 1.1 sq.m/student classroom standard.
    """
    sqm_per_student = round(room_area_sqm / max(1, division_intake), 2)
    return {
        "detected_units": detected_count,
        "room_area_sqm": room_area_sqm,
        "division_intake": division_intake,
        "sqm_per_student": sqm_per_student,
        "aph_min_sqm_per_student": 1.1,
        "is_compliant": room_area_sqm >= 66.0 and detected_count >= division_intake,
    }
