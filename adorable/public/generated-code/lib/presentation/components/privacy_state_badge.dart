import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class PrivacyStateBadge extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const PrivacyStateBadge({Key? key, required this.label, this.onTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Icon(
              LucideIcons.lock,
              color: Color(0xFF2563EB),
              size: 12,
            ),
            SizedBox(width: 6),
            Text(
              label.toString(),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
            ),
          ],
        ),
      ),
    );
  }
}
