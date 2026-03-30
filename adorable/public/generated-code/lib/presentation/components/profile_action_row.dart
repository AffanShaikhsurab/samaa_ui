import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class ProfileActionRow extends StatelessWidget {
  final String primaryLabel;
  final String secondaryLabel;
  final String tertiaryLabel;
  final VoidCallback? onPrimary;
  final VoidCallback? onSecondary;
  final VoidCallback? onTertiary;

  const ProfileActionRow({Key? key, this.primaryLabel = 'Follow', this.secondaryLabel = 'Discover', this.tertiaryLabel = 'More', this.onPrimary = null, this.onSecondary = null, this.onTertiary = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Expanded(
          child: ElevatedButton(
            onPressed: onPrimary,
            style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, padding: EdgeInsets.symmetric(horizontal: 14, vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            child: Text(primaryLabel.toString()),
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: ElevatedButton(
            onPressed: onSecondary,
            style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFF3F4F6), foregroundColor: Color(0xFF111827), padding: EdgeInsets.symmetric(horizontal: 14, vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            child: Text(secondaryLabel.toString()),
          ),
        ),
        SizedBox(width: 8),
        InkWell(
          onTap: onTertiary,
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            decoration: BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(16), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
            child: Center(
              child: Icon(
                LucideIcons.moreHorizontal,
                color: Color(0xFF111827),
                size: 18,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
