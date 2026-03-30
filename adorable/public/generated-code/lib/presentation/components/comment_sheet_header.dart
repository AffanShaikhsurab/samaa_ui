import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class CommentSheetHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onActionTap;

  const CommentSheetHeader({Key? key, this.title = 'Comments', this.onActionTap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(color: Color(0xFF3A3A3A), borderRadius: BorderRadius.circular(999)),
        ),
        SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Container(
              width: 24,
              height: 24,
            ),
            Text(
              title.toString(),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            InkWell(
              onTap: onActionTap,
              child: Container(
                width: 24,
                height: 24,
                child: Center(
                  child: Icon(
                    Icons.send_outlined,
                    color: Colors.white,
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
