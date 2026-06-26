import streamlit as st

def show_priority_badge(priority: str, color: str) -> None:
    """Render a large colored box with the priority label using st.markdown with inline CSS. Use the hex color from the API."""
    st.markdown(
        f"""
        <div style="background-color: {color}; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 15px;">
            <h2 style="color: white; margin: 0; font-family: sans-serif;">{priority.upper()}</h2>
        </div>
        """,
        unsafe_allow_html=True
    )
