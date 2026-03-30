import 'package:flutter/material.dart';

class RelationshipActionChip extends StatelessWidget {
  final String label;
  final bool active;

  const RelationshipActionChip({Key? key, required this.label, this.active = false})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          if (active) Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: Color(0xFF60A5FA), shape: BoxShape.circle),
          ),
          SizedBox(width: 6),
          Text(
            label.toString(),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
          ),
        ],
      ),
    );
  }
}
