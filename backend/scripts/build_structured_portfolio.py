import os
import shutil
import fitz  # PyMuPDF

def build_structured_portfolio():
    root_dir = os.path.abspath('../EUDR_Audit_Reports_Portfolio')
    os.makedirs(root_dir, exist_ok=True)

    configs = [
        {
            'slug': '01_Colombia_Coffee',
            'commodity': 'Coffee',
            'country': 'Colombia',
            'code': 'EUDR-CO-01230-COFFEE',
            'status': 'COMPLIANT',
            'pdf_path': 'reports/EUDR_Compliance_Audit_Report_Colombia_Coffee.pdf',
            'html_path': 'reports/EUDR_Compliance_Audit_Report_Colombia_Coffee.html',
            'hd_map1': 'reports/assets_hd/colombia_coffee_loss.png',
            'hd_map2': 'reports/assets_hd/colombia_coffee_presence.png',
            'map1_name': 'Figure_1_Forest_Canopy_and_Deforestation_Verification_Map',
            'map2_name': 'Figure_2_Google_FDP_Coffee_Canopy_Probability_Heatmap',
            'chart3_name': 'Figure_3_Multi_Sensor_Canopy_and_Agroforestry_Composition_Bar_Chart',
            'chart4_name': 'Figure_4_Sentinel2_NDVI_Phenology_Trajectory_Line_Chart',
        },
        {
            'slug': '02_Ghana_Cocoa',
            'commodity': 'Cocoa',
            'country': 'Ghana',
            'code': 'EUDR-GH-12321-COCOA',
            'status': 'NON-COMPLIANT',
            'pdf_path': 'reports/EUDR_Compliance_Audit_Report_Ghana_Cocoa.pdf',
            'html_path': 'reports/EUDR_Compliance_Audit_Report_Ghana_Cocoa.html',
            'hd_map1': 'reports/assets_hd/map1_loss_context.png',
            'hd_map2': 'reports/assets_hd/map2_cocoa_density.png',
            'map1_name': 'Figure_1_Forest_Canopy_Loss_and_Protected_Reserves_Map',
            'map2_name': 'Figure_2_Google_FDP_Cocoa_Canopy_Density_Heatmap',
            'chart3_name': 'Figure_3_Multi_Sensor_Canopy_and_Deforestation_Profile_Bar_Chart',
            'chart4_name': 'Figure_4_Sentinel2_NDVI_Phenology_Collapse_Line_Chart',
        },
        {
            'slug': '03_Thailand_Rubber',
            'commodity': 'Rubber',
            'country': 'Thailand',
            'code': 'EUDR-TH-10051-RUBBER',
            'status': 'NON-COMPLIANT',
            'pdf_path': 'reports/EUDR_Compliance_Audit_Report_Thailand_Rubber.pdf',
            'html_path': 'reports/EUDR_Compliance_Audit_Report_Thailand_Rubber.html',
            'hd_map1': 'reports/assets_hd/thailand_rubber_loss.png',
            'hd_map2': 'reports/assets_hd/thailand_rubber_presence.png',
            'map1_name': 'Figure_1_Forest_Canopy_Loss_and_Rubber_Concession_Frontier_Map',
            'map2_name': 'Figure_2_Google_FDP_Rubber_Canopy_Probability_Heatmap',
            'chart3_name': 'Figure_3_Multi_Sensor_Canopy_and_Deforestation_Profile_Bar_Chart',
            'chart4_name': 'Figure_4_Sentinel2_NDVI_Clearing_Trajectory_Line_Chart',
        },
        {
            'slug': '04_Indonesia_Palm_Oil',
            'commodity': 'Palm Oil',
            'country': 'Indonesia',
            'code': 'EUDR-ID-10052-PALM',
            'status': 'NON-COMPLIANT',
            'pdf_path': 'reports/EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil.pdf',
            'html_path': 'reports/EUDR_Compliance_Audit_Report_Indonesia_Palm_Oil.html',
            'hd_map1': 'reports/assets_hd/indonesia_palm_loss.png',
            'hd_map2': 'reports/assets_hd/indonesia_palm_presence.png',
            'map1_name': 'Figure_1_Peatland_Forest_Loss_and_Canal_Frontier_Map',
            'map2_name': 'Figure_2_Google_FDP_Palm_Canopy_Density_Heatmap',
            'chart3_name': 'Figure_3_Multi_Sensor_Canopy_and_Deforestation_Profile_Bar_Chart',
            'chart4_name': 'Figure_4_Sentinel2_NDVI_Clearing_Trajectory_Line_Chart',
        }
    ]

    brazil_old = os.path.join(root_dir, '03_Brazil_Soya')
    if os.path.exists(brazil_old):
        shutil.rmtree(brazil_old)
        print("  [OK] Removed old 03_Brazil_Soya directory")

    for cfg in configs:
        folder = os.path.join(root_dir, cfg['slug'])
        pages_folder = os.path.join(folder, 'full_pages')
        figures_folder = os.path.join(folder, 'individual_figures')
        os.makedirs(folder, exist_ok=True)
        os.makedirs(pages_folder, exist_ok=True)
        os.makedirs(figures_folder, exist_ok=True)

        print(f"\n==========================================")
        print(f"Processing: {cfg['slug']} ({cfg['commodity']})")
        print(f"==========================================")

        # 1. Copy PDF and HTML to folder root
        pdf_dest = os.path.join(folder, os.path.basename(cfg['pdf_path']))
        html_dest = os.path.join(folder, os.path.basename(cfg['html_path']))
        shutil.copy2(cfg['pdf_path'], pdf_dest)
        shutil.copy2(cfg['html_path'], html_dest)
        print(f"  [OK] Copied {os.path.basename(pdf_dest)}")
        print(f"  [OK] Copied {os.path.basename(html_dest)}")

        # 2. Render Full Pages at 200 DPI
        doc = fitz.open(cfg['pdf_path'])
        p1 = doc[0]
        p2 = doc[1]

        pix_p1 = p1.get_pixmap(dpi=200)
        pix_p2 = p2.get_pixmap(dpi=200)
        p1_path = os.path.join(pages_folder, 'Page_1_Cartographic_Evidence.png')
        p2_path = os.path.join(pages_folder, 'Page_2_Statutory_Reasoning.png')
        pix_p1.save(p1_path)
        pix_p2.save(p2_path)
        print(f"  [OK] Saved Full Page 1: {pix_p1.width}x{pix_p1.height}")
        print(f"  [OK] Saved Full Page 2: {pix_p2.width}x{pix_p2.height}")

        # 3. Copy Original Full Uncropped $1200x960 Satellite Maps (HD)
        if os.path.exists(cfg['hd_map1']):
            dst1 = os.path.join(figures_folder, f"{cfg['map1_name']}_Satellite_1200x960.png")
            shutil.copy2(cfg['hd_map1'], dst1)
            print(f"  [OK] Saved Raw HD Map 1: {os.path.basename(dst1)}")
        if os.path.exists(cfg['hd_map2']):
            dst2 = os.path.join(figures_folder, f"{cfg['map2_name']}_Satellite_1200x960.png")
            shutil.copy2(cfg['hd_map2'], dst2)
            print(f"  [OK] Saved Raw HD Map 2: {os.path.basename(dst2)}")

        # 4. Search and Crop High-Res 300 DPI Individual Figures from PDF
        # Bounding box calculation based on search:
        m_fig1 = p1.search_for('FIGURE 1')[0]
        m_fig2 = p1.search_for('FIGURE 2')[0]
        m_study = p1.search_for('STUDY AREA')[0]

        m_fig3 = p2.search_for('FIGURE 3')[0]
        m_fig4 = p2.search_for('FIGURE 4')[0]
        m_matrix = p2.search_for('Evidence Matrix')[0]
        m_sec3 = p2.search_for('3. ')[0]

        # Map 1 with Legend Card
        rect_map1 = fitz.Rect(33.75, m_fig1.y0 - 3.5, 295.0, m_study.y0 - 8.0)
        pix_m1_styled = p1.get_pixmap(clip=rect_map1, dpi=300)
        m1_styled_path = os.path.join(figures_folder, f"{cfg['map1_name']}_with_Legend.png")
        pix_m1_styled.save(m1_styled_path)
        print(f"  [OK] Cropped {os.path.basename(m1_styled_path)} ({pix_m1_styled.width}x{pix_m1_styled.height})")

        # Map 2 with Legend Card
        rect_map2 = fitz.Rect(300.0, m_fig2.y0 - 3.5, 561.25, m_study.y0 - 8.0)
        pix_m2_styled = p1.get_pixmap(clip=rect_map2, dpi=300)
        m2_styled_path = os.path.join(figures_folder, f"{cfg['map2_name']}_with_Legend.png")
        pix_m2_styled.save(m2_styled_path)
        print(f"  [OK] Cropped {os.path.basename(m2_styled_path)} ({pix_m2_styled.width}x{pix_m2_styled.height})")

        # Figure 3: Multi-Sensor Bar Chart
        rect_fig3 = fitz.Rect(33.75, m_fig3.y0 - 7.5, 295.0, m_fig3.y0 + 94.0)
        pix_fig3 = p2.get_pixmap(clip=rect_fig3, dpi=300)
        fig3_path = os.path.join(figures_folder, f"{cfg['chart3_name']}.png")
        pix_fig3.save(fig3_path)
        print(f"  [OK] Cropped {os.path.basename(fig3_path)} ({pix_fig3.width}x{pix_fig3.height})")

        # Figure 4: Sentinel-2 NDVI Line Chart
        rect_fig4 = fitz.Rect(300.0, m_fig4.y0 - 7.5, 561.25, m_fig4.y0 + 94.0)
        pix_fig4 = p2.get_pixmap(clip=rect_fig4, dpi=300)
        fig4_path = os.path.join(figures_folder, f"{cfg['chart4_name']}.png")
        pix_fig4.save(fig4_path)
        print(f"  [OK] Cropped {os.path.basename(fig4_path)} ({pix_fig4.width}x{pix_fig4.height})")

        # Multi-Sensor Evidence Matrix Table
        rect_table = fitz.Rect(33.75, m_matrix.y0 - 4.5, 561.25, m_sec3.y0 - 6.0)
        pix_table = p2.get_pixmap(clip=rect_table, dpi=300)
        table_path = os.path.join(figures_folder, "Table_Multi_Sensor_Earth_Observation_Evidence_Matrix.png")
        pix_table.save(table_path)
        print(f"  [OK] Cropped {os.path.basename(table_path)} ({pix_table.width}x{pix_table.height})")

        # Regulatory Verdict Card (Page 1 top-right badge)
        rect_verdict = fitz.Rect(436.0, 78.0, 561.25, 172.0)
        pix_verdict = p1.get_pixmap(clip=rect_verdict, dpi=300)
        verdict_path = os.path.join(figures_folder, f"Badge_Regulatory_Verdict_{cfg['status'].replace('-', '_')}.png")
        pix_verdict.save(verdict_path)
        print(f"  [OK] Cropped {os.path.basename(verdict_path)} ({pix_verdict.width}x{pix_verdict.height})")

    # Clean up any loose old files in root_dir except README.md
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        if os.path.isfile(item_path) and item != 'README.md':
            os.remove(item_path)

    print("\nPortfolio build completed successfully!")

if __name__ == '__main__':
    build_structured_portfolio()
