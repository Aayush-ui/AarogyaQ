import streamlit as st
import pandas as pd
from frontend.components.api_client import register_patient
from frontend.components.priority_badge import show_priority_badge

PRIORITY_COLORS = {
    "Critical": "#D32F2F",
    "High": "#F57C00",
    "Medium": "#F9A825",
    "Low": "#388E3C",
}

st.title("Patient Registration")
st.caption("Register a new patient and receive instant triage priority.")

col1, col2 = st.columns([2, 1])

with col1:
    with st.container(border=True):
        st.subheader("Intake Form")
        name = st.text_input("Patient Name *")
        
        c1, c2, c3 = st.columns(3)
        with c1:
            age = st.number_input("Age", min_value=0, max_value=120, value=30)
        with c2:
            gender = st.selectbox("Gender", ["Male", "Female", "Other"])
        with c3:
            phone = st.text_input("Phone", help="Used to retrieve history")
            
        chief_complaint = st.text_area(
            "Describe symptoms in your words *",
            height=100,
            placeholder="e.g. chest pain and difficulty breathing since morning, also diabetic patient"
        )
        
        pain_level = st.slider("Pain Level", 1, 10, 5)
        
        c4, c5 = st.columns(2)
        with c4:
            symptom_duration = st.number_input("Duration in minutes (Optional)", min_value=0, step=15, value=None)
        with c5:
            existing_conditions = st.multiselect(
                "Existing Conditions",
                ["Diabetes", "Hypertension", "Heart Disease", "Asthma", "Pregnancy", "Cancer", "Kidney Disease", "None"]
            )
            
        use_ai = st.checkbox("Use AI Symptom Mapping", value=False, help="Uses Ollama Llama 3.1 8B. Slower but maps complex language.")
        
        if st.button("Register & Assess Patient", type="primary"):
            if not name.strip():
                st.error("Patient Name is required.")
            elif not chief_complaint.strip():
                st.error("Chief Complaint is required.")
            else:
                payload = {
                    "name": name.strip(),
                    "age": age,
                    "gender": gender,
                    "phone": phone.strip() if phone.strip() else None,
                    "chief_complaint": chief_complaint.strip(),
                    "pain_level": pain_level,
                    "symptom_duration": symptom_duration,
                    "existing_conditions": [c for c in existing_conditions if c != "None"],
                    "use_ai": use_ai
                }
                
                with st.spinner("Assessing patient..."):
                    try:
                        result = register_patient(payload)
                        st.session_state["latest_assessment"] = result
                        st.success("Patient registered successfully!")
                    except RuntimeError as e:
                        st.error(str(e))

with col2:
    if "latest_assessment" in st.session_state:
        res = st.session_state["latest_assessment"]
        v = res.get("visit", {})
        a = res.get("assessment", {})
        s = res.get("summary", {})
        
        prio = a.get("priority_level", "Low")
        color = PRIORITY_COLORS.get(prio, "#888888")
        
        show_priority_badge(prio, color)
        
        st.markdown(f"**Risk Score:** {a.get('risk_score', 0)} / 100")
        st.markdown(f"**Queue:** {v.get('queue_type')} Queue")
        
        # Dept might be None if not assigned
        dept = v.get("department_assigned", "General OPD")
        st.markdown(f"**Department:** {dept}")
        
        mapped = a.get("mapped_symptoms", [])
        if mapped:
            st.markdown("**Mapped Symptoms:** " + ", ".join(mapped))
        else:
            st.markdown("**Mapped Symptoms:** None")
            
        # Confidence flags
        conf = a.get("confidence_scores", {})
        flagged = []
        for term in mapped:
            if conf.get(term, 1.0) < 0.75:
                flagged.append(term)
                
        if flagged:
            st.warning(f"Low confidence on: {', '.join(flagged)}. Please confirm with patient.")
            
        b_flags = a.get("business_rule_flags", [])
        if b_flags:
            st.markdown("**Business Flags:**")
            for bf in b_flags:
                st.markdown(f"<span style='background-color:#F57C00; color:white; padding:2px 6px; border-radius:4px; margin-right:4px; font-size:12px;'>{bf}</span>", unsafe_allow_html=True)
            st.write("")
            
        with st.expander("Doctor Summary"):
            st.write(s.get("summary_text", ""))
            
        with st.expander("Why this score?"):
            breakdown = a.get("score_breakdown", [])
            if breakdown:
                df = pd.DataFrame(breakdown)
                # Keep only relevant columns if they exist
                cols = [c for c in ["rule_id", "label", "score"] if c in df.columns]
                st.dataframe(df[cols], hide_index=True)
            else:
                st.write("No rules fired.")
    else:
        st.info("Fill out the form on the left to register a patient and view their triage results.")
