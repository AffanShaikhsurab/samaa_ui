import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'action_pill.dart';

class ProfileTopBar extends StatelessWidget {
  final String title;
  final String primaryLabel;
  final String secondaryLabel;
  final VoidCallback? onPrimaryAction;
  final VoidCallback? onSecondaryAction;
  final VoidCallback? onMenuTap;

  const ProfileTopBar({Key? key, required this.title, this.primaryLabel = 'Create', this.secondaryLabel = 'Share', this.onPrimaryAction = null, this.onSecondaryAction = null, this.onMenuTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Text(
          title.toString(),
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
        ),
        SizedBox(width: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            ActionPill(
              label: primaryLabel,
              iconData: LucideIcons.plusSquare,
              onTap: onPrimaryAction,
            ),
            SizedBox(width: 8),
            ActionPill(
              label: secondaryLabel,
              iconData: LucideIcons.share2,
              onTap: onSecondaryAction,
            ),
            SizedBox(width: 8),
            InkWell(
              onTap: onMenuTap,
              child: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
                child: Center(
                  child: Icon(
                    LucideIcons.moreHorizontal,
                    color: Color(0xFF111827),
                    size: 20,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
