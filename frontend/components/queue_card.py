import streamlit as st
from datetime import datetime
from frontend.components.priority_badge import show_priority_badge
from frontend.components.api_client import update_visit_status

PRIORITY_COLORS = {
    "Critical": "#D32F2F",
    "High": "#F57C00",
    "Medium": "#F9A825",
    "Low": "#388E3C",
}

def show_queue_card(visit_data: dict) -> None:
    """Render a patient card using st.container() with a border."""
    p = visit_data.get("patient", {})
    v = visit_data.get("visit", {})
    a = visit_data.get("assessment", {})
    
    # Calculate wait time
    v_time = v.get("visit_timestamp")
    wait_min = 0
    if v_time:
        if not v_time.endswith("Z"):
            v_time += "Z"
        v_dt = datetime.fromisoformat(v_time.replace("Z", "+00:00")).replace(tzinfo=None)
        wait_min = int((datetime.utcnow() - v_dt).total_seconds() / 60)
        
    prio = a.get("priority_level", "Low")
    color = PRIORITY_COLORS.get(prio, "#888888")
    
    with st.container(border=True):
        c1, c2, c3 = st.columns([2, 5, 2])
        
        with c1:
            show_priority_badge(prio, color)
            
        with c2:
            st.markdown(f"**{p.get('name', 'Unknown')}** (ID: {p.get('patient_id', 'Unknown')})")
            cc = v.get('chief_complaint', '')
            if len(cc) > 80:
                cc = cc[:77] + "..."
            st.markdown(f"*{cc}*")
            st.markdown(f"**Dept:** {v.get('department_assigned', 'General OPD')} | **Wait:** {wait_min} min")
            
        with c3:
            status = v.get("status", "Waiting")
            if status == "Waiting":
                st.info("Waiting")
                if st.button("Mark Attending", key=f"att_{v.get('visit_id')}"):
                    update_visit_status(v.get("visit_id"), "Attending", "doctor")
                    st.rerun()
            elif status == "Attending":
                st.warning("Attending")
                if st.button("Mark Completed", key=f"comp_{v.get('visit_id')}"):
                    update_visit_status(v.get("visit_id"), "Completed", "doctor")
                    st.rerun()
