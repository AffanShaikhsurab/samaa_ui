import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class InboxHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onLeading;
  final VoidCallback? onAccount;
  final VoidCallback? onMore;
  final VoidCallback? onCompose;

  const InboxHeader({Key? key, required this.title, this.onLeading = null, this.onAccount = null, this.onMore = null, this.onCompose = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        InkWell(
          onTap: onLeading,
          child: Container(
            width: 24,
            height: 24,
            child: Center(
              child: Icon(
                LucideIcons.store,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: InkWell(
            onTap: onAccount,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Text(
                  title.toString(),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                SizedBox(width: 4),
                Icon(
                  LucideIcons.chevronDown,
                  color: Colors.white,
                  size: 16,
                ),
              ],
            ),
          ),
        ),
        SizedBox(width: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            InkWell(
              onTap: onMore,
              child: Icon(
                LucideIcons.moreHorizontal,
                color: Colors.white,
                size: 20,
              ),
            ),
            SizedBox(width: 16),
            InkWell(
              onTap: onCompose,
              child: Icon(
                  LucideIcons.edit3,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
