import 'package:flutter/material.dart';

class QuickReactionBar extends StatelessWidget {
  final dynamic items;
  final ValueChanged<dynamic> onItemTap;

  const QuickReactionBar({Key? key, required this.items, required this.onItemTap})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        shrinkWrap: true,
        itemCount: items.length,
        itemBuilder: (BuildContext context, int index) {
          final item = items[index];
          return Container(
            padding: EdgeInsets.fromLTRB(0, 12, 0, 0),
            child: InkWell(
              onTap: () {
                onItemTap(item);
              },
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                decoration: BoxDecoration(color: Color(0xFF1C1C1E), borderRadius: BorderRadius.circular(999), border: Border.all(color: Color(0xFF2A2A2A), width: 1)),
                child: Text(
                  item.toString(),
                  style: const TextStyle(fontSize: 22),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
