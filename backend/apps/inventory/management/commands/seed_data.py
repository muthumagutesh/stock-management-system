import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import CustomUser
from apps.inventory.models import Category, Product, StockMovement, AuditLog
from apps.orders.models import Supplier, Customer, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem
from apps.analytics.forecasting import calculate_product_forecast
from apps.notifications.models import SystemNotification

class Command(BaseCommand):
    help = 'Seeds database with realistic Indian enterprise manufacturing inventory, GST records, and AI forecasts'

    def handle(self, *args, **options):
        self.stdout.write("Starting ApexStock India Edition database seeding...")

        # 1. Create Users
        admin_user, _ = CustomUser.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@apexstock.in',
                'first_name': 'Aarav',
                'last_name': 'Sharma',
                'role': CustomUser.Role.ADMIN,
                'phone': '+91 98200 12345',
                'is_staff': True,
                'is_superuser': True,
                'department': 'Corporate Operations - Mumbai HQ'
            }
        )
        admin_user.set_password('Admin@123')
        admin_user.save()

        manager_user, _ = CustomUser.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@apexstock.in',
                'first_name': 'Pooja',
                'last_name': 'Iyer',
                'role': CustomUser.Role.MANAGER,
                'phone': '+91 98450 67890',
                'is_staff': True,
                'department': 'Supply Chain & Procurement - Pune Plant'
            }
        )
        manager_user.set_password('Manager@123')
        manager_user.save()

        staff_user, _ = CustomUser.objects.get_or_create(
            username='staff',
            defaults={
                'email': 'staff@apexstock.in',
                'first_name': 'Vikram',
                'last_name': 'Patel',
                'role': CustomUser.Role.STAFF,
                'phone': '+91 97120 45678',
                'is_staff': False,
                'department': 'Warehouse Dock - Chennai Hub'
            }
        )
        staff_user.set_password('Staff@123')
        staff_user.save()

        viewer_user, _ = CustomUser.objects.get_or_create(
            username='viewer',
            defaults={
                'email': 'auditor@tax-audit.in',
                'first_name': 'Ananya',
                'last_name': 'Deshmukh',
                'role': CustomUser.Role.VIEWER,
                'phone': '+91 99300 88990',
                'is_staff': False,
                'department': 'GST Compliance & Audit'
            }
        )
        viewer_user.set_password('Viewer@123')
        viewer_user.save()

        self.stdout.write(self.style.SUCCESS("[OK] Indian enterprise operator accounts created (admin, manager, staff, viewer)"))

        # 2. Categories
        categories_data = [
            {'name': 'Industrial Robotics & Automation', 'slug': 'robotics', 'icon': 'Cpu', 'description': 'AC Servos, programmable logic controllers, industrial VFDs and robotic sensors'},
            {'name': 'Semiconductors & Embedded Systems', 'slug': 'semiconductors', 'icon': 'Zap', 'description': 'ARM microcontrollers, FPGA processors, sensor telemetry arrays'},
            {'name': 'Precision Machining & Carbide Tooling', 'slug': 'precision-machining', 'icon': 'Wrench', 'description': 'Tungsten carbide end mills, aerospace collets, titanium fasteners'},
            {'name': 'Industrial IoT & Telemetry Hardware', 'slug': 'iot-telemetry', 'icon': 'Radio', 'description': 'Wireless telemetry gateways, 5G modems, RS485 environmental sensors'},
            {'name': 'Safety Gear & Industrial PPE Hardware', 'slug': 'safety-hardware', 'icon': 'ShieldCheck', 'description': 'PAPR respirators, fixed thermal radiometers, hazardous PPE'},
        ]

        cat_objs = {}
        for c in categories_data:
            obj, _ = Category.objects.get_or_create(slug=c['slug'], defaults=c)
            cat_objs[c['slug']] = obj

        # 3. Certified Indian Suppliers
        suppliers_data = [
            {
                'name': 'Tata Steel Industrial Alloys Ltd', 'code': 'SUP-TATA-01',
                'gstin': '20AAACT2727Q1ZW', 'pan': 'AAACT2727Q', 'state': 'Jharkhand (20)',
                'contact_name': 'Rajesh Nambiar', 'email': 'b2b-orders@tatasteel.com',
                'phone': '+91 657 242 4001', 'address': 'Bistupur Industrial Area, Jamshedpur, Jharkhand 831001',
                'lead_time_days': 6, 'rating': Decimal('4.9'), 'reliability_score': 98.5, 'payment_terms': 'Net 30 Days'
            },
            {
                'name': 'Bharat Electronics Ltd (BEL)', 'code': 'SUP-BEL-02',
                'gstin': '29AAACB0188F1ZR', 'pan': 'AAACB0188F', 'state': 'Karnataka (29)',
                'contact_name': 'K. S. Ramanathan', 'email': 'sales@bel-india.com',
                'phone': '+91 80 2503 9300', 'address': 'Outer Ring Road, Nagavara, Bengaluru, Karnataka 560045',
                'lead_time_days': 8, 'rating': Decimal('4.8'), 'reliability_score': 96.0, 'payment_terms': 'Net 45 Days'
            },
            {
                'name': 'Reliance Industries Petrochemicals & Composites', 'code': 'SUP-RIL-03',
                'gstin': '24AAACR5055K1Z2', 'pan': 'AAACR5055K', 'state': 'Gujarat (24)',
                'contact_name': 'Sanjay Mehta', 'email': 'polymers@ril.com',
                'phone': '+91 22 3555 5000', 'address': 'Moti Khavdi Complex, Jamnagar, Gujarat 361140',
                'lead_time_days': 4, 'rating': Decimal('4.7'), 'reliability_score': 94.2, 'payment_terms': 'Advance / Letter of Credit'
            },
            {
                'name': 'Larsen & Toubro Electrical & Automation', 'code': 'SUP-LNT-04',
                'gstin': '33AAACL0140P1ZU', 'pan': 'AAACL0140P', 'state': 'Tamil Nadu (33)',
                'contact_name': 'M. Venkatesh', 'email': 'switchgear@larsentoubro.com',
                'phone': '+91 44 2252 6000', 'address': 'Mount Poonamallee Road, Manapakkam, Chennai 600089',
                'lead_time_days': 7, 'rating': Decimal('4.9'), 'reliability_score': 97.8, 'payment_terms': 'Net 30 Days'
            },
        ]
        sup_objs = []
        for s in suppliers_data:
            s_obj, _ = Supplier.objects.get_or_create(code=s['code'], defaults=s)
            sup_objs.append(s_obj)

        # 4. Indian Industrial Customers
        customers_data = [
            {
                'name': 'Maruti Suzuki India Ltd', 'code': 'CUST-MSIL-01',
                'customer_type': 'CORPORATE', 'gstin': '06AAACM0801G1ZY', 'pan': 'AAACM0801G', 'state': 'Haryana (06)',
                'contact_name': 'Deepak Khurana', 'email': 'parts.procure@maruti.co.in',
                'phone': '+91 124 234 6721', 'address': 'Palam Gurgaon Road, Gurugram, Haryana 122015',
                'credit_limit': Decimal('7500000.00'), 'balance': Decimal('420000.00'), 'loyalty_points': 4200
            },
            {
                'name': 'Mahindra & Mahindra Ltd Automotive', 'code': 'CUST-MHM-02',
                'customer_type': 'WHOLESALE', 'gstin': '27AAACM1112D1ZR', 'pan': 'AAACM1112D', 'state': 'Maharashtra (27)',
                'contact_name': 'Sameer Joshi', 'email': 'vendor.desk@mahindra.com',
                'phone': '+91 2135 667 000', 'address': 'Chakan Industrial Area, Phase II, Pune, Maharashtra 410501',
                'credit_limit': Decimal('5000000.00'), 'balance': Decimal('180000.00'), 'loyalty_points': 2800
            },
            {
                'name': 'Tata Motors Commercial Vehicles', 'code': 'CUST-TML-03',
                'customer_type': 'CORPORATE', 'gstin': '27AAACT2727Q1ZY', 'pan': 'AAACT2727Q', 'state': 'Maharashtra (27)',
                'contact_name': 'Nitin Sawant', 'email': 'cv.supply@tatamotors.com',
                'phone': '+91 20 6613 1111', 'address': 'Sector 15, PCMC Industrial Zone, Pimpri, Pune 411018',
                'credit_limit': Decimal('8000000.00'), 'balance': Decimal('650000.00'), 'loyalty_points': 6100
            },
            {
                'name': 'Bharat Heavy Electricals Ltd (BHEL)', 'code': 'CUST-BHEL-04',
                'customer_type': 'WHOLESALE', 'gstin': '36AAACB4146P1Z3', 'pan': 'AAACB4146P', 'state': 'Telangana (36)',
                'contact_name': 'G. Sudhakar', 'email': 'procurement@bhelhyd.co.in',
                'phone': '+91 40 2318 2000', 'address': 'Ramachandrapuram, Hyderabad, Telangana 502032',
                'credit_limit': Decimal('4000000.00'), 'balance': Decimal('0.00'), 'loyalty_points': 1500
            },
        ]
        cust_objs = []
        for c in customers_data:
            c_obj, _ = Customer.objects.get_or_create(code=c['code'], defaults=c)
            cust_objs.append(c_obj)

        self.stdout.write(self.style.SUCCESS("[OK] Indian suppliers & customers created with GSTIN details"))

        # 5. Product Catalog (Pricing in Indian Rupees ₹, HSN codes, GST slabs)
        now = timezone.now()
        products_data = [
            {
                'sku': 'ROB-SERVO-900', 'name': 'UltraTorque Brushless Servo Motor 48V', 'category': cat_objs['robotics'],
                'hsn_code': '8501', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('12500.00'), 'selling_price': Decimal('22800.00'), 'mrp': Decimal('26500.00'),
                'quantity_on_hand': 8, 'min_stock_level': 20, 'max_stock_level': 150, 'reorder_quantity': 40,
                'unit': 'pcs', 'location': 'Pune Bay A-3, Rack 12', 'batch_number': 'BATCH-IN-2026-01',
                'description': 'High precision optical encoder servo motor for robotic arms and CNC gantry positioning.'
            },
            {
                'sku': 'ROB-PLC-8000', 'name': 'QuantumEdge Industrial PLC Controller', 'category': cat_objs['robotics'],
                'hsn_code': '8537', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('34000.00'), 'selling_price': Decimal('58500.00'), 'mrp': Decimal('65000.00'),
                'quantity_on_hand': 45, 'min_stock_level': 15, 'max_stock_level': 100, 'reorder_quantity': 30,
                'unit': 'pcs', 'location': 'Pune Bay A-1, Cabinet 4', 'batch_number': 'BATCH-IN-2026-02',
                'description': 'Dual-core real-time ARM Cortex-R5 controller with EtherCAT and PROFINET support.'
            },
            {
                'sku': 'SEMI-FPGA-X9', 'name': 'Kintex UltraScale+ FPGA Processing Card', 'category': cat_objs['semiconductors'],
                'hsn_code': '8473', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('55000.00'), 'selling_price': Decimal('98000.00'), 'mrp': Decimal('112000.00'),
                'quantity_on_hand': 0, 'min_stock_level': 10, 'max_stock_level': 60, 'reorder_quantity': 25,
                'unit': 'pcs', 'location': 'Clean Room Shelf C', 'batch_number': 'BATCH-IN-2026-03',
                'description': 'High-bandwidth digital signal processing accelerator for edge machine vision.'
            },
            {
                'sku': 'SEMI-ARM-32', 'name': 'STM32H7 Dual-Core High Performance MCU', 'category': cat_objs['semiconductors'],
                'hsn_code': '8542', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('1450.00'), 'selling_price': Decimal('2850.00'), 'mrp': Decimal('3400.00'),
                'quantity_on_hand': 550, 'min_stock_level': 100, 'max_stock_level': 1000, 'reorder_quantity': 300,
                'unit': 'tray', 'location': 'Bin 24-B', 'batch_number': 'BATCH-IN-2026-04',
                'description': 'Cortex-M7 & M4 microcontrollers running up to 480 MHz with hardware crypto acceleration.'
            },
            {
                'sku': 'TOOL-CARB-08', 'name': 'Solid Carbide 4-Flute End Mill 8mm TiAlN', 'category': cat_objs['precision-machining'],
                'hsn_code': '8207', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('1850.00'), 'selling_price': Decimal('3650.00'), 'mrp': Decimal('4200.00'),
                'quantity_on_hand': 12, 'min_stock_level': 25, 'max_stock_level': 200, 'reorder_quantity': 50,
                'unit': 'pack', 'location': 'Tool Crib Drawer 8', 'batch_number': 'BATCH-IN-2026-05',
                'description': 'Titanium Aluminum Nitride coated for high speed dry milling in hardened alloy steel.'
            },
            {
                'sku': 'TOOL-COLLET-ER32', 'name': 'Precision Spring Collet Set ER-32 (18 Pcs)', 'category': cat_objs['precision-machining'],
                'hsn_code': '8466', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('6800.00'), 'selling_price': Decimal('12900.00'), 'mrp': Decimal('14500.00'),
                'quantity_on_hand': 38, 'min_stock_level': 15, 'max_stock_level': 100, 'reorder_quantity': 25,
                'unit': 'set', 'location': 'Tool Crib Shelf 2', 'batch_number': 'BATCH-IN-2026-06',
                'description': 'Concentricity within 0.005mm DIN 6499 standard for aerospace CNC milling.'
            },
            {
                'sku': 'IOT-GW-5G', 'name': 'Ruggedized Industrial 5G Telemetry Gateway', 'category': cat_objs['iot-telemetry'],
                'hsn_code': '8517', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('22500.00'), 'selling_price': Decimal('42000.00'), 'mrp': Decimal('48000.00'),
                'quantity_on_hand': 22, 'min_stock_level': 10, 'max_stock_level': 80, 'reorder_quantity': 20,
                'unit': 'pcs', 'location': 'Telecom Rack 3', 'batch_number': 'BATCH-IN-2026-07',
                'description': 'IP67 rated cellular wireless gateway with dual SIM failover and GPS tracking.'
            },
            {
                'sku': 'IOT-SENS-VIB', 'name': 'Tri-Axis Wireless Vibration & Temp Sensor', 'category': cat_objs['iot-telemetry'],
                'hsn_code': '9031', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('3600.00'), 'selling_price': Decimal('7400.00'), 'mrp': Decimal('8500.00'),
                'quantity_on_hand': 5, 'min_stock_level': 30, 'max_stock_level': 250, 'reorder_quantity': 80,
                'unit': 'pcs', 'location': 'Sensor Cabinet 2', 'batch_number': 'BATCH-IN-2026-08',
                'description': 'Predictive maintenance sensor for bearings, turbines, and industrial blowers.'
            },
            {
                'sku': 'SAFE-CAM-FLIR', 'name': 'Fixed Mount Thermal Imaging Radiometer', 'category': cat_objs['safety-hardware'],
                'hsn_code': '9025', 'gst_rate': Decimal('18.00'),
                'cost_price': Decimal('74000.00'), 'selling_price': Decimal('142000.00'), 'mrp': Decimal('160000.00'),
                'quantity_on_hand': 14, 'min_stock_level': 5, 'max_stock_level': 30, 'reorder_quantity': 10,
                'unit': 'pcs', 'location': 'Secure Vault S-1', 'batch_number': 'BATCH-IN-2026-09',
                'description': 'Detects thermal anomalies in electrical substations and combustible storage.'
            },
            {
                'sku': 'SAFE-RESP-PAPR', 'name': 'Powered Air Purifying Respirator Kit', 'category': cat_objs['safety-hardware'],
                'hsn_code': '9020', 'gst_rate': Decimal('12.00'), # 12% GST medical/safety gear
                'cost_price': Decimal('24500.00'), 'selling_price': Decimal('46000.00'), 'mrp': Decimal('52000.00'),
                'quantity_on_hand': 18, 'min_stock_level': 12, 'max_stock_level': 60, 'reorder_quantity': 20,
                'unit': 'kit', 'location': 'Safety Locker 4', 'batch_number': 'BATCH-IN-2026-10',
                'expiry_date': (now + timedelta(days=720)).date(),
                'description': 'HEPA particle filtration with smart airflow sensor and lithium battery pack.'
            },
        ]

        prod_objs = []
        for p in products_data:
            p_obj, _ = Product.objects.get_or_create(sku=p['sku'], defaults=p)
            prod_objs.append(p_obj)

        self.stdout.write(self.style.SUCCESS(f"[OK] Indian industrial products created ({len(prod_objs)} items with INR pricing and HSN codes)"))

        # 6. Seed Historical Stock Movements (in ₹ INR)
        for p in prod_objs:
            StockMovement.objects.get_or_create(
                reference_number=f"INIT-RESTOCK-{p.sku}",
                defaults={
                    'product': p,
                    'movement_type': StockMovement.MovementType.IN,
                    'quantity': p.reorder_quantity * 2,
                    'previous_stock': 0,
                    'new_stock': p.reorder_quantity * 2,
                    'unit_price': p.cost_price,
                    'created_by': admin_user,
                    'notes': 'Initial warehouse baseline receipt at Pune facility'
                }
            )
            StockMovement.objects.get_or_create(
                reference_number=f"HIST-SALE-{p.sku}-1",
                defaults={
                    'product': p,
                    'movement_type': StockMovement.MovementType.OUT,
                    'quantity': random.randint(5, 18),
                    'previous_stock': p.reorder_quantity * 2,
                    'new_stock': max(0, p.reorder_quantity * 2 - 12),
                    'unit_price': p.selling_price,
                    'created_by': staff_user,
                    'notes': 'Tax invoice dispatch'
                }
            )

        # 7. Seed Initial Purchase Orders & Sales Orders with GST Breakdown
        # PO 1: Intra-state from Maharashtra supplier or Inter-state from Tata Steel
        po1, _ = PurchaseOrder.objects.get_or_create(
            po_number='PO-IN-2026-0001',
            defaults={
                'supplier': sup_objs[0], # Tata Steel (Jharkhand) -> Inter-state IGST
                'status': PurchaseOrder.Status.RECEIVED,
                'is_inter_state': True,
                'e_way_bill_number': '241829401928',
                'ordered_date': (now - timedelta(days=15)).date(),
                'received_date': (now - timedelta(days=10)),
                'created_by': manager_user,
                'notes': 'Quarterly semiconductor & alloy replenishments via Blue Dart Express'
            }
        )
        PurchaseOrderItem.objects.get_or_create(
            purchase_order=po1, product=prod_objs[3],
            defaults={'quantity_ordered': 200, 'quantity_received': 200, 'unit_cost': prod_objs[3].cost_price}
        )
        po1.recalculate_total()

        # PO 2: In transit from BEL
        po2, _ = PurchaseOrder.objects.get_or_create(
            po_number='PO-IN-2026-0002',
            defaults={
                'supplier': sup_objs[1], # BEL
                'status': PurchaseOrder.Status.ORDERED,
                'is_inter_state': True,
                'e_way_bill_number': '291049281734',
                'ordered_date': (now - timedelta(days=2)).date(),
                'expected_delivery_date': (now + timedelta(days=5)).date(),
                'created_by': manager_user,
                'notes': 'Urgent restock of servo motors and telemetry sensors'
            }
        )
        PurchaseOrderItem.objects.get_or_create(
            purchase_order=po2, product=prod_objs[0],
            defaults={'quantity_ordered': 30, 'quantity_received': 0, 'unit_cost': prod_objs[0].cost_price}
        )
        PurchaseOrderItem.objects.get_or_create(
            purchase_order=po2, product=prod_objs[7],
            defaults={'quantity_ordered': 50, 'quantity_received': 0, 'unit_cost': prod_objs[7].cost_price}
        )
        po2.recalculate_total()

        # Sales Orders
        # SO 1: Intra-state to Mahindra (Pune) -> CGST + SGST (9% + 9%)
        so1, _ = SalesOrder.objects.get_or_create(
            so_number='SO-IN-2026-0001',
            defaults={
                'customer': cust_objs[1], # Mahindra (Maharashtra)
                'status': SalesOrder.Status.DELIVERED,
                'payment_status': SalesOrder.PaymentStatus.PAID,
                'is_inter_state': False,
                'e_way_bill_number': '271928491823',
                'razorpay_payment_id': 'pay_MhIn_01928374',
                'shipping_address': cust_objs[1].address,
                'created_by': staff_user,
                'notes': 'Fast-track shipment for Chakan Assembly Line 2'
            }
        )
        SalesOrderItem.objects.get_or_create(
            sales_order=so1, product=prod_objs[1],
            defaults={'quantity': 5, 'unit_price': prod_objs[1].selling_price}
        )
        SalesOrderItem.objects.get_or_create(
            sales_order=so1, product=prod_objs[6],
            defaults={'quantity': 4, 'unit_price': prod_objs[6].selling_price}
        )
        so1.recalculate_total()

        # SO 2: Inter-state to Maruti Suzuki (Gurugram, Haryana) -> IGST (18%)
        so2, _ = SalesOrder.objects.get_or_create(
            so_number='SO-IN-2026-0002',
            defaults={
                'customer': cust_objs[0], # Maruti Suzuki
                'status': SalesOrder.Status.PROCESSING,
                'payment_status': SalesOrder.PaymentStatus.PAID,
                'is_inter_state': True,
                'e_way_bill_number': '061928491039',
                'razorpay_payment_id': 'pay_MszIn_99281734',
                'shipping_address': cust_objs[0].address,
                'created_by': staff_user,
                'notes': 'Awaiting final quality inspection before dispatch to Gurugram plant'
            }
        )
        SalesOrderItem.objects.get_or_create(
            sales_order=so2, product=prod_objs[0],
            defaults={'quantity': 2, 'unit_price': prod_objs[0].selling_price}
        )
        SalesOrderItem.objects.get_or_create(
            sales_order=so2, product=prod_objs[8],
            defaults={'quantity': 1, 'unit_price': prod_objs[8].selling_price}
        )
        so2.recalculate_total()

        self.stdout.write(self.style.SUCCESS("[OK] Indian GST Purchase and Sales Orders seeded with tax calculations"))

        # 8. Run AI Demand Forecasting for all products
        for p in prod_objs:
            calculate_product_forecast(p)
        self.stdout.write(self.style.SUCCESS("[OK] AI 30/60/90 day forecasts & price optimization calculated for all items"))

        # 9. Create Notifications
        SystemNotification.objects.get_or_create(
            title="Out of Stock Alert: Kintex UltraScale+ FPGA",
            defaults={
                'message': "Product SEMI-FPGA-X9 has hit 0 units in Pune warehouse. Maruti Suzuki & Mahindra line backorders pending. Reorder recommended.",
                'notification_type': SystemNotification.NotificationType.OUT_OF_STOCK,
                'severity': SystemNotification.Severity.CRITICAL,
                'target_role': 'ALL',
                'related_link': '/inventory'
            }
        )
        SystemNotification.objects.get_or_create(
            title="Low Stock Warning: Tri-Axis Wireless Vibration Sensor",
            defaults={
                'message': "Stock level (5 pcs) is below reorder threshold (30 pcs). AI predicts stockout in 3 days. Recommend issuing PO to Bharat Electronics Ltd.",
                'notification_type': SystemNotification.NotificationType.LOW_STOCK,
                'severity': SystemNotification.Severity.WARNING,
                'target_role': 'ALL',
                'related_link': '/reorder'
            }
        )
        SystemNotification.objects.get_or_create(
            title="PO-IN-2026-0002 Dispatched by Bharat Electronics Ltd",
            defaults={
                'message': "Supplier confirmed dispatch under e-Way Bill 291049281734. Estimated dock arrival in 5 days.",
                'notification_type': SystemNotification.NotificationType.ORDER_STATUS,
                'severity': SystemNotification.Severity.INFO,
                'target_role': 'ALL',
                'related_link': '/purchases'
            }
        )

        self.stdout.write(self.style.SUCCESS("[OK] Indian GST Notifications created"))
        self.stdout.write(self.style.SUCCESS("=== APEXSTOCK INDIA EDITION SEEDING COMPLETED SUCCESSFULLY ==="))
