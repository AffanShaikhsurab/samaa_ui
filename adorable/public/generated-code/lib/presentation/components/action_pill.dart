import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ActionPill extends StatelessWidget {
  final String label;
  final IconData iconData;
  final VoidCallback? onTap;

  const ActionPill({Key? key, required this.label, required this.iconData, this.onTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Icon(
              iconData,
              color: Color(0xFF111827),
              size: 16,
            ),
            SizedBox(width: 8),
            Text(
              label.toString(),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
            ),
          ],
        ),
      ),
    );
  }
}
